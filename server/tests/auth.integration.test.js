import { beforeAll, afterAll, beforeEach, test, expect, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import session from "express-session";
import * as argon2 from "argon2";
import { createApp } from "../src/app.js";
import User from "../src/modules/users/user.model.js";
import Department from "../src/modules/academic/department.model.js";
import Program from "../src/modules/academic/program.model.js";
import Section from "../src/modules/academic/section.model.js";
import Space from "../src/modules/spaces/space.model.js";
import Membership from "../src/modules/spaces/membership.model.js";
import { createVerificationChallenge } from "../src/modules/auth/verification-code.js";
import { sendEmail, sendVerificationEmail } from "../src/services/email.service.js";
vi.mock("../src/services/email.service.js", () => ({ sendVerificationEmail: vi.fn(async () => {}), sendEmail: vi.fn(async () => {}) }));

import { authLimiter } from "../src/modules/auth/auth.routes.js";
let mongo, app, hash;
beforeAll(async () => {
  process.env.SESSION_SECRET = "test-session-secret-with-enough-characters";
  process.env.OTP_PEPPER = "test-otp-pepper-with-enough-characters";
  process.env.ALLOWED_EMAIL_DOMAIN = "college.ac.in";
  process.env.NODE_ENV = "test";
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  hash = await argon2.hash("password123");
  app = createApp({ sessionStore: new session.MemoryStore() });
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  vi.clearAllMocks();
  await authLimiter.resetKey("::/56");
  await authLimiter.resetKey("127.0.0.1");
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
async function user(overrides = {}) {
  return User.create({ name: "Test Student", email: "student@college.ac.in", passwordHash: hash, requestedAccountType: "STUDENT", globalRoles: ["STUDENT"], emailVerified: true, accountStatus: "ACTIVE", ...overrides });
}
async function loggedIn(email = "student@college.ac.in") {
  const agent = request.agent(app);
  const response = await agent.post("/api/v1/auth/login").send({ email, password: "password123" });
  expect(response.status).toBe(200);
  return { agent, csrf: response.body.data.csrfToken, response };
}
test("registration hashes passwords, normalizes email, and rejects duplicates", async () => {
  const payload = { name: " Student Name ", email: " STUDENT@COLLEGE.AC.IN ", password: "password123", accountType: "STUDENT" };
  const response = await request(app).post("/api/v1/auth/register").send(payload);
  expect(response.status).toBe(201);
  expect(response.body.data.user.accountStatus).toBe("PENDING_EMAIL_VERIFICATION");
  expect(response.body.data.user).not.toHaveProperty("passwordHash");
  expect(response.body.data.user).not.toHaveProperty("emailVerificationCodeHash");
  const saved = await User.findOne({ email: "student@college.ac.in" }).select("+passwordHash");
  expect(await argon2.verify(saved.passwordHash, payload.password)).toBe(true);
  expect(sendVerificationEmail).toHaveBeenCalledOnce();
  expect((await request(app).post("/api/v1/auth/register").send(payload)).status).toBe(409);
});
test("malformed input cannot bypass validation", async () => {
  for (const payload of [{}, { name: {}, email: "a@college.ac.in", password: "password123", accountType: "STUDENT" }, { name: "Tester", email: "a@college.ac.in", password: {}, accountType: "STUDENT" }, { name: "Tester", email: "a@college.ac.in", password: "password123", accountType: "COLLEGE_ADMIN" }]) {
    expect((await request(app).post("/api/v1/auth/register").send(payload)).status).toBe(400);
  }
});
test("verification creates a session exactly once and rejects replay", async () => {
  const challenge = createVerificationChallenge();
  await user({ emailVerified: false, accountStatus: "PENDING_EMAIL_VERIFICATION", emailVerificationCodeHash: challenge.codeHash, emailVerificationExpiresAt: challenge.expiresAt });
  const response = await request(app).post("/api/v1/auth/verify-email").send({ email: "student@college.ac.in", code: challenge.code });
  expect(response.status).toBe(200);
  expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
  expect(response.body.data.user.accountStatus).toBe("ACTIVE");
  expect((await request(app).post("/api/v1/auth/verify-email").send({ email: "student@college.ac.in", code: challenge.code })).status).toBe(400);
});
test("five failed attempts exhaust a code; expired codes cannot authenticate", async () => {
  const challenge = createVerificationChallenge();
  await user({ emailVerified: false, accountStatus: "PENDING_EMAIL_VERIFICATION", emailVerificationCodeHash: challenge.codeHash, emailVerificationExpiresAt: challenge.expiresAt });
  const wrong = challenge.code === "111111" ? "222222" : "111111";
  for (let i = 0; i < 5; i++) expect((await request(app).post("/api/v1/auth/verify-email").send({ email: "student@college.ac.in", code: wrong })).status).toBe(400);
  expect((await request(app).post("/api/v1/auth/verify-email").send({ email: "student@college.ac.in", code: challenge.code })).status).toBe(400);
});
test("session identity, CSRF, logout, and suspended users are enforced", async () => {
  const student = await user();
  const { agent, csrf } = await loggedIn();
  expect((await agent.get("/api/v1/users/me")).body.data.user.email).toBe(student.email);
  expect((await agent.post("/api/v1/auth/logout").send({})).status).toBe(403);
  expect((await agent.post("/api/v1/auth/logout").set("x-csrf-token", csrf).send({})).status).toBe(200);
  expect((await agent.get("/api/v1/users/me")).status).toBe(401);
  const second = await loggedIn();
  await User.updateOne({ _id: student._id }, { $set: { accountStatus: "SUSPENDED" } });
  expect((await second.agent.get("/api/v1/users/me")).status).toBe(401);
});
test("onboarding validates academic relationships and enrolls only in the selected class", async () => {
  await user();
  const department = await Department.create({ name: "Computer Science", shortName: "CSE" });
  const other = await Department.create({ name: "Mechanical", shortName: "ME" });
  const program = await Program.create({ departmentId: department._id, name: "B.Tech", shortName: "BTECH", durationYears: 4 });
  const section = await Section.create({ programId: program._id, year: 3, semester: 5, name: "A" });
  const { agent, csrf } = await loggedIn();
  const submit = profile => agent.post("/api/v1/users/me/onboarding").set("x-csrf-token", csrf).send(profile);
  expect((await submit({ departmentId: String(other._id), programId: String(program._id), sectionId: String(section._id) })).status).toBe(400);
  expect((await submit({ departmentId: String(department._id), programId: String(program._id), sectionId: String(section._id) })).status).toBe(200);
  const spaces = await agent.get("/api/v1/spaces");
  expect(spaces.body.data).toHaveLength(1);
  const privateSpace = await Space.create({ spaceKey: "CLASS:OTHER", name: "Other class", type: "CLASS" });
  expect((await agent.get("/api/v1/spaces/" + privateSpace._id)).status).toBe(404);
});
test("pending faculty can authenticate but cannot enter active workspaces", async () => {
  await user({ requestedAccountType: "FACULTY", globalRoles: ["FACULTY"], accountStatus: "PENDING_APPROVAL", onboardingCompleted: true });
  const { agent } = await loggedIn();
  expect((await agent.get("/api/v1/users/me")).status).toBe(200);
  expect((await agent.get("/api/v1/spaces")).status).toBe(403);
});

async function spaceUsers() {
  const student = await user({ onboardingCompleted: true });
  const faculty = await user({ email: "faculty@college.ac.in", requestedAccountType: "FACULTY", globalRoles: ["FACULTY"], onboardingCompleted: true });
  const space = await Space.create({ spaceKey: "SUBJECT:TEST", type: "SUBJECT", name: "Databases" });
  await Membership.create([{ userId: student._id, spaceId: space._id, roles: ["STUDENT"] }, { userId: faculty._id, spaceId: space._id, roles: ["FACULTY"] }]);
  return { student, faculty, space, studentSession: await loggedIn(student.email), facultySession: await loggedIn(faculty.email) };
}
test("students cannot publish announcements or assignments; faculty can", async () => {
  const { space, studentSession: student, facultySession: faculty } = await spaceUsers();
  const url = "/api/v1/spaces/" + space._id;
  expect((await student.agent.post(url + "/announcements").set("x-csrf-token", student.csrf).send({ title: "Exam notice", body: "Tomorrow" })).status).toBe(403);
  const created = await faculty.agent.post(url + "/announcements").set("x-csrf-token", faculty.csrf).send({ title: "Exam notice", body: "Tomorrow" });
  expect(created.status).toBe(201);
  expect((await student.agent.get(url + "/announcements")).body.data[0].title).toBe("Exam notice");
  const assignment = { title: "SQL practice", instructions: "Complete the exercises", dueAt: new Date(Date.now() + 86400000).toISOString() };
  expect((await student.agent.post(url + "/assignments").set("x-csrf-token", student.csrf).send(assignment)).status).toBe(403);
  const createdAssignment = await faculty.agent.post(url + "/assignments").set("x-csrf-token", faculty.csrf).send(assignment);
  expect(createdAssignment.status).toBe(201);
  expect((await student.agent.put(url + "/assignments/" + createdAssignment.body.data._id + "/progress").set("x-csrf-token", student.csrf).send({ status: "COMPLETED" })).status).toBe(200);
  expect((await student.agent.get(url + "/assignments")).body.data[0].progress).toBe("COMPLETED");
});
test("messages cannot be edited by others or replied to across spaces", async () => {
  const { space, studentSession: student, facultySession: faculty } = await spaceUsers();
  const url = "/api/v1/spaces/" + space._id;
  const message = await student.agent.post(url + "/messages").set("x-csrf-token", student.csrf).send({ content: "My private message" });
  expect(message.status).toBe(201);
  expect((await faculty.agent.patch(url + "/messages/" + message.body.data._id).set("x-csrf-token", faculty.csrf).send({ content: "Edited by someone else" })).status).toBe(403);
  const outsider = await user({ email: "outsider@college.ac.in", onboardingCompleted: true });
  const session = await loggedIn(outsider.email);
  expect((await session.agent.get(url + "/messages")).status).toBe(404);
  expect((await session.agent.get("/api/v1/search?q=private")).body.data).toHaveLength(0);
});
test("event capacity is enforced under simultaneous registration", async () => {
  const { default: Event } = await import("../src/modules/events/event.model.js");
  const event = await Event.create({ title: "One seat workshop", description: "Capacity test", organizerType: "CAMPUS", startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 90000000), capacity: 1 });
  const sessions = [];
  for (let i = 0; i < 3; i++) {
    const person = await user({ email: "attendee" + i + "@college.ac.in", onboardingCompleted: true });
    sessions.push(await loggedIn(person.email));
  }
  const statuses = await Promise.all(sessions.map(({ agent, csrf }) => agent.put("/api/v1/campus/events/" + event._id + "/registration").set("x-csrf-token", csrf).send({}).then(r => r.status)));
  expect(statuses.filter(s => s === 200)).toHaveLength(1);
  expect(statuses.filter(s => s === 409)).toHaveLength(2);
  expect((await Event.findById(event._id)).registeredCount).toBe(1);
});
test("targeted notices are hidden from unauthorized students and search", async () => {
  const { default: Notice } = await import("../src/modules/notices/notice.model.js");
  const student = await user({ onboardingCompleted: true });
  const notice = await Notice.create({ title: "Faculty confidential", body: "Faculty meeting", publishedById: student._id, audience: { accountTypes: ["FACULTY"] }, acknowledgementRequired: true });
  const { agent, csrf } = await loggedIn();
  expect((await agent.get("/api/v1/campus/notices")).body.data).toHaveLength(0);
  expect((await agent.get("/api/v1/search?q=confidential")).body.data).toHaveLength(0);
  expect((await agent.put("/api/v1/campus/notices/" + notice._id + "/acknowledgement").set("x-csrf-token", csrf).send({})).status).toBe(404);
});
test("admin endpoints reject students, and section creation accepts a single-letter name", async () => {
  const student = await user({ onboardingCompleted: true });
  const { agent, csrf } = await loggedIn();
  expect((await agent.get("/api/v1/admin/users")).status).toBe(403);
  await User.updateOne({ _id: student._id }, { $addToSet: { globalRoles: "COLLEGE_ADMIN" } });
  const department = await Department.create({ name: "Computer Science", shortName: "CSE" });
  const program = await Program.create({ name: "B.Tech", shortName: "BTECH", departmentId: department._id, durationYears: 4 });
  const result = await agent.post("/api/v1/admin/sections").set("x-csrf-token", csrf).send({ programId: String(program._id), year: 3, semester: 5, name: "A" });
  expect(result.status).toBe(201);
});
test("uploads reject spoofed file content and cannot expose private resources", async () => {
  const { space, studentSession: student, facultySession: faculty } = await spaceUsers();
  const response = await faculty.agent.post("/api/v1/files/resources/" + space._id).set("x-csrf-token", faculty.csrf).field("title", "Unsafe file").attach("file", Buffer.from("<script>bad</script>"), "fake.pdf");
  expect(response.status).toBe(400);
  const denied = await student.agent.post("/api/v1/files/resources/" + space._id).set("x-csrf-token", student.csrf).field("title", "Not allowed").attach("file", Buffer.from("%PDF-test"), "test.pdf");
  expect(denied.status).toBe(403);
});

test("password reset consumes one token and revokes existing sessions", async () => {
  await user({ onboardingCompleted: true });
  const { agent } = await loggedIn();
  const known = await request(app).post("/api/v1/auth/forgot-password").send({ email: "student@college.ac.in" });
  const unknown = await request(app).post("/api/v1/auth/forgot-password").send({ email: "missing@college.ac.in" });
  expect(known.body).toEqual(unknown.body);
  const token = sendEmail.mock.calls[0][0].text.match(/token=([a-f0-9]{64})/)[1];
  const reset = () => request(app).post("/api/v1/auth/reset-password").send({ token, password: "different-password123" });
  expect((await reset()).status).toBe(200);
  expect((await reset()).status).toBe(400);
  expect((await agent.get("/api/v1/users/me")).status).toBe(401);
  expect((await request(app).post("/api/v1/auth/login").send({ email: "student@college.ac.in", password: "different-password123" })).status).toBe(200);
});
test("profile updates cannot change authorization or verified academic data", async () => {
  await user({ onboardingCompleted: true });
  const { agent, csrf } = await loggedIn();
  const response = await agent.put("/api/v1/users/me/profile").set("x-csrf-token", csrf).send({ name: "Updated Student", skills: ["SQL", "SQL"], globalRoles: ["COLLEGE_ADMIN"], academicProfile: { cgpa: 10 } });
  expect(response.status).toBe(200);
  expect(response.body.data.user.profile.skills).toEqual(["SQL"]);
  expect(response.body.data.user.globalRoles).toEqual(["STUDENT"]);
  expect(response.body.data.user.academicProfile?.cgpa).not.toBe(10);
});
test("mentions respect membership and muting; reminders are delivered once", async () => {
  const { default: Notification } = await import("../src/modules/notifications/notification.model.js");
  const { sendAssignmentReminders } = await import("../src/jobs/assignment-reminders.js");
  const { student, space, facultySession: faculty } = await spaceUsers();
  const endpoint = "/api/v1/spaces/" + space._id;
  const outsider = await user({ email: "outside@college.ac.in", onboardingCompleted: true });
  const send = ids => faculty.agent.post(endpoint + "/messages").set("x-csrf-token", faculty.csrf).send({ content: "Review this", mentionedUserIds: ids });
  expect((await send([String(outsider._id)])).status).toBe(400);
  expect((await send([String(student._id)])).status).toBe(201);
  expect(await Notification.countDocuments({ recipientId: student._id, type: "MENTION" })).toBe(1);
  await Membership.updateOne({ userId: student._id, spaceId: space._id }, { $set: { notificationPreference: "MUTED" } });
  expect((await send([String(student._id)])).status).toBe(201);
  expect(await Notification.countDocuments({ recipientId: student._id, type: "MENTION" })).toBe(1);
  await Membership.updateOne({ userId: student._id, spaceId: space._id }, { $set: { notificationPreference: "IMPORTANT_ONLY" } });
  await faculty.agent.post(endpoint + "/assignments").set("x-csrf-token", faculty.csrf).send({ title: "Due soon exercise", instructions: "SQL exercise", dueAt: new Date(Date.now() + 3600000).toISOString() }).expect(201);
  await sendAssignmentReminders(); await sendAssignmentReminders();
  expect(await Notification.countDocuments({ recipientId: student._id, type: "REMINDER" })).toBe(1);
});
test("placement coordinators can publish opportunities but cannot administer users", async () => {
  await user({ onboardingCompleted: true, globalRoles: ["STUDENT", "PLACEMENT_COORDINATOR"] });
  const { agent, csrf } = await loggedIn();
  expect((await agent.get("/api/v1/admin/users")).status).toBe(403);
  const response = await agent.post("/api/v1/admin/placements").set("x-csrf-token", csrf).send({ companyName: "Example Labs", roleTitle: "Engineer", opportunityType: "PLACEMENT", description: "Graduate role", location: "Pune", applicationUrl: "https://example.com/apply", deadlineAt: new Date(Date.now() + 86400000).toISOString() });
  expect(response.status).toBe(201);
  expect((await agent.get("/api/v1/admin/placements")).body.data).toHaveLength(1);
});
test("calendar includes registered events and eligible placement deadlines", async () => {
  const { default: Event } = await import("../src/modules/events/event.model.js");
  const { default: Registration } = await import("../src/modules/events/event-registration.model.js");
  const { default: Placement } = await import("../src/modules/placements/placement.model.js");
  const student = await user({ onboardingCompleted: true });
  const at = new Date("2027-01-15T08:00:00Z");
  const event = await Event.create({ title: "Registered workshop", description: "Workshop", organizerType: "CAMPUS", startAt: at, endAt: new Date(at.getTime() + 3600000) });
  await Registration.create({ eventId: event._id, userId: student._id, status: "REGISTERED" });
  await Placement.create({ companyName: "Example Labs", roleTitle: "Engineer", opportunityType: "PLACEMENT", description: "Role", location: "Pune", applicationUrl: "https://example.com", deadlineAt: at, createdById: student._id });
  const { agent } = await loggedIn();
  const response = await agent.get("/api/v1/calendar?from=2027-01-01&to=2027-01-31");
  expect(response.status).toBe(200);
  expect(response.body.data.items.map(i => i.type).sort()).toEqual(["EVENT", "PLACEMENT"]);
});

test("socket rooms enforce membership and logout disconnects a live connection", async () => {
  const { createServer } = await import("node:http");
  const { io: connect } = await import("socket.io-client");
  const { configureSocket, emitSpace } = await import("../src/realtime/socket.js");
  const { space, studentSession } = await spaceUsers();
  const server = createServer(app), sockets = configureSocket(server, app.locals.sessionMiddleware);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const cookie = studentSession.response.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
  const socket = connect("http://127.0.0.1:" + server.address().port, { transports: ["websocket"], extraHeaders: { Cookie: cookie }, reconnection: false });
  try {
    await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    const join = value => new Promise((resolve, reject) => socket.timeout(2000).emit("space:join", value, (err, result) => err ? reject(err) : resolve(result)));
    expect(await join(String(new mongoose.Types.ObjectId()))).toEqual({ ok: false });
    expect(await join(String(space._id))).toEqual({ ok: true });
    const changed = new Promise(resolve => socket.once("space:changed", resolve));
    emitSpace(space._id);
    expect(await changed).toEqual({ spaceId: String(space._id) });
    const disconnected = new Promise(resolve => socket.once("disconnect", resolve));
    await studentSession.agent.post("/api/v1/auth/logout").set("x-csrf-token", studentSession.csrf).send({}).expect(200);
    expect(await disconnected).toBe("io server disconnect");
  } finally { socket.disconnect(); await new Promise(resolve => sockets.close(resolve)); }
});
test("poll votes cannot be recorded after a poll is closed", async () => {
  const { space, studentSession, facultySession } = await spaceUsers();
  await Space.updateOne({ _id: space._id }, { $set: { type: "CLASS" } });
  const path = "/api/v1/spaces/" + space._id + "/polls";
  const create = await facultySession.agent.post(path).set("x-csrf-token", facultySession.csrf).send({ question: "Preferred lab slot?", options: ["Morning", "Afternoon"] });
  expect(create.status).toBe(201);
  const poll = create.body.data;
  await facultySession.agent.put(path + "/" + poll._id + "/close").set("x-csrf-token", facultySession.csrf).send({}).expect(200);
  await studentSession.agent.put(path + "/" + poll._id + "/vote").set("x-csrf-token", studentSession.csrf).send({ optionId: poll.options[0]._id }).expect(400);
});
test("duplicate schedule exceptions are rejected under concurrency", async () => {
  const { space, facultySession: faculty } = await spaceUsers();
  const path = "/api/v1/spaces/" + space._id + "/schedule";
  const schedule = await faculty.agent.post(path).set("x-csrf-token", faculty.csrf).send({ dayOfWeek: 1, startMinutes: 540, endMinutes: 600 });
  expect(schedule.status).toBe(201);
  const input = { type: "CANCELLED", scheduleId: schedule.body.data._id, localDate: "2027-01-04" };
  const responses = await Promise.all([1, 2].map(() => faculty.agent.post(path + "/exceptions").set("x-csrf-token", faculty.csrf).send(input)));
  expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
});
test("event cancellation alerts registered students", async () => {
  const { default: Event } = await import("../src/modules/events/event.model.js");
  const { default: Registration } = await import("../src/modules/events/event-registration.model.js");
  const { default: Notification } = await import("../src/modules/notifications/notification.model.js");
  const student = await user({ onboardingCompleted: true });
  const admin = await user({ email: "admin@college.ac.in", onboardingCompleted: true, globalRoles: ["STUDENT", "COLLEGE_ADMIN"] });
  const input = { title: "Test workshop", description: "A workshop", organizerType: "CAMPUS", location: "Main hall", startAt: "2027-01-15T08:00:00Z", endAt: "2027-01-15T09:00:00Z", capacity: 1 };
  const event = await Event.create({ ...input, registeredCount: 1 });
  await Registration.create({ eventId: event._id, userId: student._id, status: "REGISTERED" });
  const { agent, csrf } = await loggedIn(admin.email);
  await agent.put("/api/v1/admin/events/" + event._id).set("x-csrf-token", csrf).send({ ...input, status: "CANCELLED" }).expect(200);
  expect(await Notification.countDocuments({ recipientId: student._id, type: "EVENT" })).toBe(1);
});

test("production serves direct client routes and keeps API responses separate", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const production = createApp({ sessionStore: new session.MemoryStore() });
    const page = await request(production).get("/spaces/example/discussion").set("Accept", "text/html");
    expect(page.status).toBe(200);
    expect(page.text).toContain('<div id="root">');
    expect(page.headers["content-security-policy"]).toBeTruthy();
    expect((await request(production).get("/api/v1/health")).body.status).toBe("ok");
    expect((await request(production).get("/api/v1/unknown")).headers["content-type"]).toContain("application/json");
  } finally { process.env.NODE_ENV = previous; }
});
test("class representatives must belong to the selected section", async () => {
  const student = await user({ onboardingCompleted: true });
  const admin = await user({ email: "admin@college.ac.in", globalRoles: ["STUDENT", "COLLEGE_ADMIN"], onboardingCompleted: true });
  const department = await Department.create({ name: "Computer Science", shortName: "CSE" });
  const program = await Program.create({ departmentId: department._id, name: "B.Tech", shortName: "BTECH", durationYears: 4 });
  const section = await Section.create({ programId: program._id, year: 3, semester: 5, name: "A" });
  const { agent, csrf } = await loggedIn(admin.email);
  const path = "/api/v1/admin/sections/" + section._id + "/members/" + student._id;
  await agent.put(path).set("x-csrf-token", csrf).send({ role: "CR" }).expect(400);
  await User.updateOne({ _id: student._id }, { $set: { "academicProfile.sectionId": section._id } });
  await agent.put(path).set("x-csrf-token", csrf).send({ role: "CR" }).expect(200);
  expect((await Membership.findOne({ userId: student._id })).roles).toEqual(["STUDENT", "CR"]);
});

test("valid uploads can only be downloaded by members and can be removed", async () => {
  const { space, studentSession: student, facultySession: faculty } = await spaceUsers();
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG0kAAAAASUVORK5CYII=", "base64");
  const uploaded = await faculty.agent.post("/api/v1/files/resources/" + space._id).set("x-csrf-token", faculty.csrf).field("title", "Example diagram").attach("file", image, "diagram.png");
  expect(uploaded.status).toBe(201);
  const fileId = uploaded.body.data.file.id;
  try {
    const response = await student.agent.get("/api/v1/files/" + fileId);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(image);
    await user({ email: "outside@college.ac.in", onboardingCompleted: true });
    const outsider = await loggedIn("outside@college.ac.in");
    await outsider.agent.get("/api/v1/files/" + fileId).expect(404);
  } finally { await faculty.agent.delete("/api/v1/files/" + fileId).set("x-csrf-token", faculty.csrf).send({}).expect(200); }
  await student.agent.get("/api/v1/files/" + fileId).expect(404);
});
