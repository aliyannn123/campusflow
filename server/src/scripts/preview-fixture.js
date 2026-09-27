// Disposable local-only browser QA. Never connects to the configured Atlas database.
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import session from "express-session";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { createApp } from "../app.js";
import User from "../modules/users/user.model.js";
import Department from "../modules/academic/department.model.js";
import Program from "../modules/academic/program.model.js";
import Section from "../modules/academic/section.model.js";
import Subject from "../modules/academic/subject.model.js";
import Offering from "../modules/academic/subject-offering.model.js";
import Announcement from "../modules/announcements/announcement.model.js";
import Assignment from "../modules/assignments/assignment.model.js";
import Club from "../modules/clubs/club.model.js";
import Space from "../modules/spaces/space.model.js";
import Event from "../modules/events/event.model.js";
import { syncAcademicMemberships, accessibleSpaces, enroll } from "../modules/spaces/space.service.js";
import { configureSocket } from "../realtime/socket.js";
if (process.env.NODE_ENV === "production") throw new Error("The preview fixture is not available in production.");
process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGIN = "http://localhost:5174";
process.env.SESSION_SECRET = randomBytes(48).toString("hex");
process.env.OTP_PEPPER = randomBytes(48).toString("hex");
process.env.ALLOWED_EMAIL_DOMAIN = "walchandsangli.ac.in";
process.env.EMAIL_MODE = "console";
const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await mongoose.connect(database.getUri());
await Promise.all(Object.values(mongoose.models).map(model => model.init()));
const passwordHash = await argon2.hash("CampusFlow-demo-2026");
const department = await Department.create({ name: "Computer Science & Engineering", shortName: "CSE" });
const program = await Program.create({ name: "B.Tech Computer Science", shortName: "BTECH", durationYears: 4, departmentId: department._id });
const section = await Section.create({ name: "A", programId: program._id, year: 3, semester: 5 });
const student = await User.create({ name: "Aarav Patil", email: "student@walchandsangli.ac.in", passwordHash, requestedAccountType: "STUDENT", globalRoles: ["STUDENT"], emailVerified: true, accountStatus: "ACTIVE", onboardingCompleted: true, academicProfile: { departmentId: department._id, programId: program._id, sectionId: section._id, year: 3, semester: 5 } });
const faculty = await User.create({ name: "Prof. Meera Kulkarni", email: "faculty@walchandsangli.ac.in", passwordHash, requestedAccountType: "FACULTY", globalRoles: ["FACULTY"], emailVerified: true, accountStatus: "ACTIVE", onboardingCompleted: true, facultyProfile: { departmentId: department._id, designation: "Assistant Professor" } });
await User.create({ name: "Demo Administrator", email: "admin@walchandsangli.ac.in", passwordHash, requestedAccountType: "FACULTY", globalRoles: ["FACULTY", "COLLEGE_ADMIN"], emailVerified: true, accountStatus: "ACTIVE", onboardingCompleted: true, facultyProfile: { departmentId: department._id, designation: "Administrator" } });
for (const [code, name] of [["CS501", "Database Management Systems"], ["CS502", "Operating Systems"], ["CS503", "Computer Networks"]]) {
  const subject = await Subject.create({ code, name, departmentId: department._id });
  await Offering.create({ subjectId: subject._id, programId: program._id, sectionId: section._id, year: 3, semester: 5, academicYear: "2026-2027", primaryFacultyId: faculty._id });
}
await syncAcademicMemberships(student); await syncAcademicMemberships(faculty);
const spaces = await accessibleSpaces(student._id);
for (const [i, space] of spaces.filter(s => s.type === "SUBJECT").entries()) {
  await Assignment.create({ title: ["Relational algebra exercises", "Process scheduling analysis", "Network topology lab"][i], instructions: "Review the lecture notes and complete the practice exercises before the next class.", dueAt: new Date(Date.now() + (i + 1) * 86400000), spaceId: space._id, createdById: faculty._id });
  await Announcement.create({ title: "Welcome to " + space.name, body: "Lecture notes and class updates will be shared in this workspace. Please check the schedule before our next session.", spaceId: space._id, authorId: faculty._id });
}
const club = await Club.create({ name: "The Coding Circle", slug: "coding-circle", description: "A space to build, learn and solve problems together.", category: "TECHNICAL" });
const clubSpace = await Space.create({ spaceKey: "CLUB:" + club._id, name: club.name, type: "CLUB" });
club.spaceId = clubSpace._id; await club.save(); await enroll(student._id, clubSpace._id, "MEMBER");
await Event.create({ title: "Build Night", description: "Bring an idea. Leave with a working prototype.", organizerType: "CAMPUS", startAt: new Date(Date.now() + 2 * 86400000), endAt: new Date(Date.now() + 2 * 86400000 + 7200000), location: "Innovation Lab", capacity: 40 });
const app = createApp({ sessionStore: new session.MemoryStore() });
const server = createServer(app); configureSocket(server, app.locals.sessionMiddleware);
server.listen(5010, "127.0.0.1", () => console.log("Disposable preview API: http://127.0.0.1:5010. Demo accounts: student/faculty/admin@walchandsangli.ac.in; password: CampusFlow-demo-2026"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { server.close(); await mongoose.disconnect(); await database.stop(); process.exit(0); });
