import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, requireActive, requireRoles } from "../../middleware/auth.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { schemas } from "./admin.schemas.js";
import User from "../users/user.model.js";
import { toPublicUser } from "../users/user.utils.js";
import Department from "../academic/department.model.js";
import Program from "../academic/program.model.js";
import Section from "../academic/section.model.js";
import Subject from "../academic/subject.model.js";
import Offering from "../academic/subject-offering.model.js";
import Space from "../spaces/space.model.js";
import Membership from "../spaces/membership.model.js";
import { ensureSubjectSpace, ensureClassSpace, syncAcademicMemberships } from "../spaces/space.service.js";
import Club from "../clubs/club.model.js";
import Notice from "../notices/notice.model.js";
import Acknowledgement from "../notices/notice-acknowledgement.model.js";
import Event from "../events/event.model.js";
import Registration from "../events/event-registration.model.js";
import Placement from "../placements/placement.model.js";
import Tracking from "../placements/placement-tracking.model.js";
import Audit from "../moderation/audit-log.model.js";
import Organization from "../organization/organization.model.js";
import { getOrganization } from "../organization/organization.service.js";
import { audienceMatches, placementEligibility } from "../campus/eligibility.js";
import { notifyUsers } from "../notifications/notification.service.js";
import { disconnectUser } from "../../realtime/socket.js";
import { updateAcademicProfile } from "./user-management.js";
export async function audit(req, action, targetType, targetId, summary = "") {
  await Audit.create({ actorUserId: req.user._id, action, targetType, targetId, summary });
}
const models = { departments: Department, programs: Program, sections: Section, subjects: Subject, offerings: Offering, clubs: Club, notices: Notice, events: Event, placements: Placement };
const router = Router();
router.use(requireAuth, requireActive, (req, res, next) => {
  if (req.user.globalRoles.includes("COLLEGE_ADMIN")) return next();
  if (req.user.globalRoles.includes("PLACEMENT_COORDINATOR") && (/^\/placements(?:\/|$)/.test(req.path) || (req.method === "GET" && req.path === "/departments"))) return next();
  return requireRoles("COLLEGE_ADMIN")(req, res, next);
});
router.put("/users/:itemId/academic-profile", updateAcademicProfile);
router.get("/overview", async (req, res) => {
  const [users, pendingFaculty, spaces, clubs, events] = await Promise.all([User.countDocuments(), User.countDocuments({ requestedAccountType: "FACULTY", accountStatus: "PENDING_APPROVAL" }), Space.countDocuments({ status: "ACTIVE" }), Club.countDocuments({ status: "ACTIVE" }), Event.countDocuments({ status: "ACTIVE", endAt: { $gte: new Date() } })]);
  res.json({ data: { users, pendingFaculty, spaces, clubs, events } });
});
router.get("/users", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.accountStatus = z.enum(["ACTIVE", "PENDING_APPROVAL", "PENDING_EMAIL_VERIFICATION", "SUSPENDED"]).parse(req.query.status);
  if (req.query.q) { const value = z.string().max(100).parse(req.query.q).replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&"); filter.$or = [{ name: { $regex: value, $options: "i" } }, { email: { $regex: value, $options: "i" } }]; }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ data: users.map(toPublicUser) });
});
router.put("/users/:itemId/status", async (req, res) => {
  const userId = id.parse(req.params.itemId);
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(req.body.accountStatus);
  if (String(req.user._id) === userId) fail(400, "You cannot change your own account status.");
  const user = await User.findById(userId);
  if (!user) fail(404, "User not found.");
  if (!user.emailVerified && status === "ACTIVE") fail(400, "The user must verify their own email first.");
  user.accountStatus = status; user.sessionVersion = (user.sessionVersion || 0) + 1; await user.save();
  disconnectUser(userId);
  if (status === "ACTIVE" && user.onboardingCompleted) await syncAcademicMemberships(user);
  await audit(req, "USER_STATUS", "USER", user._id, status);
  res.json({ data: toPublicUser(user) });
});
router.put("/users/:itemId/roles", async (req, res) => {
  const user = await User.findById(id.parse(req.params.itemId));
  if (!user) fail(404, "User not found.");
  if (String(user._id) === String(req.user._id)) fail(400, "Another administrator must change your roles.");
  const roles = z.array(z.enum(["DEPARTMENT_ADMIN", "PLACEMENT_COORDINATOR", "COLLEGE_ADMIN"])).max(3).parse(req.body.roles);
  user.globalRoles = [user.requestedAccountType, ...new Set(roles)];
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save(); disconnectUser(user._id);
  await audit(req, "USER_ROLES", "USER", user._id, roles.join(", "));
  res.json({ data: toPublicUser(user) });
});
router.get("/organization", async (req, res) => res.json({ data: await getOrganization() }));
router.put("/organization", async (req, res) => {
  const input = schemas.organization.parse(req.body);
  const record = await Organization.findOneAndUpdate({ organizationKey: "PRIMARY" }, { $set: { ...input, updatedById: req.user._id } }, { returnDocument: "after", runValidators: true });
  await audit(req, "ORGANIZATION_UPDATE", "ORGANIZATION", record._id);
  res.json({ data: record });
});
router.get("/audit", async (req, res) => res.json({ data: await Audit.find().populate("actorUserId", "name").sort({ createdAt: -1 }).limit(200).lean() }));

async function validateRelations(kind, input) {
  if (["programs", "subjects"].includes(kind) && !await Department.exists({ _id: input.departmentId, status: "ACTIVE" })) fail(400, "Choose an active department.");
  if (kind === "sections") {
    const program = await Program.findOne({ _id: input.programId, status: "ACTIVE" });
    if (!program || input.year > program.durationYears || Math.ceil(input.semester / 2) !== input.year) fail(400, "Year and semester must belong to this program.");
  }
  if (kind === "offerings") {
    const section = await Section.findOne({ _id: input.sectionId, programId: input.programId, status: "ACTIVE" });
    const program = section && await Program.findOne({ _id: input.programId, status: "ACTIVE" });
    const subject = program && await Subject.findOne({ _id: input.subjectId, departmentId: program.departmentId, status: "ACTIVE" });
    if (!subject) fail(400, "Select a subject, program and section from the same active department.");
    if (input.primaryFacultyId && !await User.exists({ _id: input.primaryFacultyId, requestedAccountType: "FACULTY", accountStatus: "ACTIVE", "facultyProfile.departmentId": program.departmentId })) fail(400, "Assign active faculty from this department.");
    input.year = section.year; input.semester = section.semester;
  }
  if (kind === "events") {
    if (input.endAt <= input.startAt) fail(400, "Event end must be after its start.");
    if (input.organizerType === "CLUB") {
      const club = input.clubId && await Club.findOne({ _id: input.clubId, status: "ACTIVE" });
      if (!club) fail(400, "Choose an active club.");
      input.spaceId = club.spaceId;
    } else { input.clubId = null; input.spaceId = null; }
  }
  const audience = input.audience || input.eligibility;
  if (audience?.departmentIds?.length && await Department.countDocuments({ _id: { $in: audience.departmentIds }, status: "ACTIVE" }) !== new Set(audience.departmentIds).size) fail(400, "Audience contains an unknown department.");
}
async function synchronize(kind, record) {
  if (kind === "sections" && record.status === "ACTIVE") await ensureClassSpace(record);
  if (kind === "sections" && record.status === "INACTIVE") await Space.updateMany({ sectionId: record._id }, { $set: { status: "ARCHIVED" } });
  if (kind === "clubs") {
    const space = await Space.findOneAndUpdate({ spaceKey: "CLUB:" + record._id }, { $set: { name: record.name, type: "CLUB", status: record.status === "ACTIVE" ? "ACTIVE" : "ARCHIVED" } }, { upsert: true, returnDocument: "after" });
    record.spaceId = space._id; await record.save();
  }
  if (kind === "offerings") {
    if (record.status === "ACTIVE") await ensureSubjectSpace(record);
    else await Space.updateOne({ subjectOfferingId: record._id }, { $set: { status: "ARCHIVED" } });
    for await (const user of User.find({ onboardingCompleted: true, $or: [{ "academicProfile.sectionId": record.sectionId }, { requestedAccountType: "FACULTY" }] }).cursor()) await syncAcademicMemberships(user);
  }
}
for (const [kind, Model] of Object.entries(models)) {
  router.get("/" + kind, async (req, res) => res.json({ data: await Model.find().sort({ createdAt: -1 }).limit(200).lean() }));
  router.post("/" + kind, async (req, res) => {
    const input = schemas[kind].parse(req.body);
    await validateRelations(kind, input);
    const record = await Model.create({ ...input, createdById: req.user._id, publishedById: req.user._id });
    await synchronize(kind, record);
    if (["notices", "events", "placements"].includes(kind)) {
      const users = await User.find({ accountStatus: "ACTIVE", onboardingCompleted: true });
      const recipients = users.filter(user => kind === "placements" ? placementEligibility(user, record.eligibility) !== "INELIGIBLE" : audienceMatches(user, record.audience || record.eligibility));
      await notifyUsers({ userIds: recipients.map(u => u._id), actorId: req.user._id, type: { notices: "NOTICE", events: "EVENT", placements: "PLACEMENT" }[kind], title: record.title || record.companyName + " · " + record.roleTitle, message: "A new campus update is available.", sourceId: record._id, destination: "/campus/" + kind });
    }
    await audit(req, "CREATE_" + kind.toUpperCase(), kind, record._id);
    res.status(201).json({ data: record });
  });
  router.put("/" + kind + "/:itemId", async (req, res) => {
    let record = await Model.findById(id.parse(req.params.itemId));
    if (!record) fail(404, "Record not found.");
    const input = schemas[kind].parse(req.body); await validateRelations(kind, input);
    if (input.status === "INACTIVE") {
      const dependent = { departments: [Program, "departmentId"], programs: [Section, "programId"], sections: [Offering, "sectionId"], subjects: [Offering, "subjectId"] }[kind];
      if (dependent && await dependent[0].exists({ [dependent[1]]: record._id, status: "ACTIVE" })) fail(409, "Deactivate dependent academic records first.");
    }
    if (kind === "events" && input.capacity != null && input.capacity < record.registeredCount) fail(409, "Capacity cannot be below existing registrations.");
    const normalizedAudience = audience => JSON.stringify([...(audience.accountTypes || [])].sort()) + JSON.stringify((audience.departmentIds || []).map(String).sort()) + JSON.stringify([...(audience.years || [])].sort());
    if (kind === "notices" && normalizedAudience(input.audience) !== normalizedAudience(record.audience)) fail(400, "Create a new notice to change its audience.");
    if (kind === "events") {
      // The capacity predicate is evaluated atomically against concurrent registrations.
      record = await Model.findOneAndUpdate({ _id: record._id, ...(input.capacity == null ? {} : { registeredCount: { $lte: input.capacity } }) }, { $set: input }, { returnDocument: "after", runValidators: true });
      if (!record) fail(409, "Capacity cannot be below existing registrations.");
    } else { Object.assign(record, input); await record.save(); }
    await synchronize(kind, record);
    if (["events", "placements", "notices"].includes(kind)) {
      let recipients;
      if (kind === "events") recipients = (await Registration.find({ eventId: record._id, status: "REGISTERED" })).map(r => r.userId);
      else if (kind === "placements") recipients = (await Tracking.find({ placementId: record._id })).map(r => r.userId);
      else recipients = (await User.find({ accountStatus: "ACTIVE", onboardingCompleted: true })).filter(u => audienceMatches(u, record.audience)).map(u => u._id);
      await notifyUsers({ userIds: recipients, actorId: req.user._id, type: { events: "EVENT", placements: "PLACEMENT", notices: "NOTICE" }[kind], title: record.title || record.companyName + " · " + record.roleTitle, message: "Updated · " + record.status.toLowerCase(), sourceId: record._id, dedupeKey: "update:" + record._id + ":" + record.updatedAt.getTime(), destination: "/campus/" + kind });
    }
    await audit(req, "UPDATE_" + kind.toUpperCase(), kind, record._id);
    res.json({ data: record });
  });
}
router.get("/events/:itemId/registrations", async (req, res) => res.json({ data: await Registration.find({ eventId: id.parse(req.params.itemId) }).populate("userId", "name email").lean() }));
router.get("/sections/:itemId/members", async (req, res) => {
  const space = await Space.findOne({ sectionId: id.parse(req.params.itemId), type: "CLASS" });
  if (!space) fail(404, "Class space not found.");
  res.json({ data: await Membership.find({ spaceId: space._id, status: "ACTIVE" }).populate("userId", "name email").lean() });
});
router.put("/sections/:itemId/members/:userId", async (req, res) => {
  const section = await Section.findOne({ _id: id.parse(req.params.itemId), status: "ACTIVE" });
  if (!section) fail(404, "Section not found.");
  const program = await Program.findById(section.programId);
  const user = await User.findOne({ _id: id.parse(req.params.userId), accountStatus: "ACTIVE", onboardingCompleted: true });
  const role = z.enum(["STUDENT", "CR", "CLASS_COORDINATOR"]).parse(req.body.role);
  if (!user || (role === "CLASS_COORDINATOR" ? user.requestedAccountType !== "FACULTY" || String(user.facultyProfile.departmentId) !== String(program.departmentId) : user.requestedAccountType !== "STUDENT" || String(user.academicProfile.sectionId) !== String(section._id))) fail(400, "Choose a student from this section or faculty from its department.");
  const space = await ensureClassSpace(section);
  await Membership.updateOne({ spaceId: space._id, userId: user._id }, { $set: { roles: role === "CR" ? ["STUDENT", "CR"] : [role], status: "ACTIVE" } }, { upsert: true });
  disconnectUser(user._id);
  await audit(req, "CLASS_MEMBERSHIP", "SPACE", space._id, role);
  res.json({ success: true });
});
router.get("/notices/:itemId/acknowledgements", async (req, res) => res.json({ data: await Acknowledgement.find({ noticeId: id.parse(req.params.itemId) }).populate("userId", "name").lean() }));
router.get("/placements/:itemId/tracking", async (req, res) => res.json({ data: await Tracking.find({ placementId: id.parse(req.params.itemId) }).populate("userId", "name email academicProfile").lean() }));
router.get("/clubs/:itemId/members", async (req, res) => {
  const club = await Club.findById(id.parse(req.params.itemId)); if (!club) fail(404, "Club not found.");
  res.json({ data: await Membership.find({ spaceId: club.spaceId }).populate("userId", "name email").lean() });
});
router.put("/clubs/:itemId/members/:userId", async (req, res) => {
  const club = await Club.findById(id.parse(req.params.itemId)); if (!club) fail(404, "Club not found.");
  const userId = id.parse(req.params.userId);
  if (!await User.exists({ _id: userId, accountStatus: "ACTIVE" })) fail(400, "Choose an active user.");
  const roles = z.array(z.enum(["MEMBER", "CORE_TEAM", "CLUB_LEAD"])).min(1).max(3).parse(req.body.roles);
  const status = z.enum(["ACTIVE", "INACTIVE"]).parse(req.body.status);
  await mongoose.connection.transaction(async session => {
    // Serialize leadership transfers on the club record.
    await Club.updateOne({ _id: club._id }, { $set: { updatedAt: new Date() } }, { session });
    if (roles.includes("CLUB_LEAD") && status === "ACTIVE") await Membership.updateMany({ spaceId: club.spaceId, roles: "CLUB_LEAD", userId: { $ne: userId } }, { $set: { roles: ["MEMBER"] } }, { session });
    await Membership.updateOne({ spaceId: club.spaceId, userId }, { $set: { roles: [...new Set(["MEMBER", ...roles])], status } }, { upsert: true, session });
  });
  disconnectUser(userId);
  await audit(req, "CLUB_MEMBERSHIP", "CLUB", club._id);
  res.json({ success: true });
});
export default router;
