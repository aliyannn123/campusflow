import Space from "./space.model.js";
import Membership from "./membership.model.js";
import Section from "../academic/section.model.js";
import SubjectOffering from "../academic/subject-offering.model.js";
import "../academic/subject.model.js";
import { fail } from "../../lib/errors.js";
import { id } from "../../lib/validation.js";

export async function ensureClassSpace(section) {
  return Space.findOneAndUpdate({ spaceKey: "CLASS:" + section._id }, {
    $set: { name: "Year " + section.year + " · Semester " + section.semester + " · Section " + section.name, sectionId: section._id, type: "CLASS", status: "ACTIVE" },
  }, { upsert: true, returnDocument: "after" });
}
export async function ensureSubjectSpace(offering) {
  await offering.populate("subjectId");
  return Space.findOneAndUpdate({ spaceKey: "SUBJECT:" + offering._id }, {
    $set: { name: offering.subjectId.name, subjectOfferingId: offering._id, sectionId: offering.sectionId, type: "SUBJECT", status: "ACTIVE" },
  }, { upsert: true, returnDocument: "after" });
}
export async function enroll(userId, spaceId, role) {
  return Membership.findOneAndUpdate({ userId, spaceId }, { $set: { status: "ACTIVE" }, $addToSet: { roles: role } }, { upsert: true, returnDocument: "after" });
}
export async function syncAcademicMemberships(user) {
  if (user.requestedAccountType === "STUDENT" && user.academicProfile?.sectionId) {
    const section = await Section.findOne({ _id: user.academicProfile.sectionId, status: "ACTIVE" });
    if (!section) fail(400, "Your section is no longer active.");
    const classSpace = await ensureClassSpace(section);
    const spaces = [classSpace];
    const offerings = await SubjectOffering.find({ sectionId: section._id, status: "ACTIVE" });
    for (const offering of offerings) spaces.push(await ensureSubjectSpace(offering));
    const allAcademic = await Space.find({ type: { $in: ["CLASS", "SUBJECT"] } }).select("_id");
    await Membership.updateMany({ userId: user._id, spaceId: { $in: allAcademic.map(s => s._id), $nin: spaces.map(s => s._id) } }, { $set: { status: "INACTIVE" } });
    for (const space of spaces) await enroll(user._id, space._id, "STUDENT");
  } else if (user.requestedAccountType === "FACULTY") {
    const offerings = await SubjectOffering.find({ primaryFacultyId: user._id, status: "ACTIVE" });
    const spaces = [];
    for (const offering of offerings) spaces.push(await ensureSubjectSpace(offering));
    const allSubjects = await Space.find({ type: "SUBJECT" }).select("_id");
    await Membership.updateMany({ userId: user._id, roles: "FACULTY", spaceId: { $in: allSubjects.map(s => s._id), $nin: spaces.map(s => s._id) } }, { $set: { status: "INACTIVE" } });
    for (const space of spaces) await enroll(user._id, space._id, "FACULTY");
  }
}
export async function accessibleSpaces(userId) {
  const memberships = await Membership.find({ userId, status: "ACTIVE" }).populate({ path: "spaceId", match: { status: "ACTIVE" } }).lean();
  return memberships.filter(m => m.spaceId).map(m => ({ ...m.spaceId, roles: m.roles }));
}
export async function requireSpace(userId, spaceId, { manage = false } = {}) {
  id.parse(spaceId);
  const membership = await Membership.findOne({ userId, spaceId, status: "ACTIVE" });
  const space = membership && await Space.findOne({ _id: spaceId, status: "ACTIVE" }).populate({ path: "subjectOfferingId", populate: [{ path: "subjectId" }, { path: "primaryFacultyId", select: "name" }] });
  if (!space) fail(404, "Space not found.");
  const canManage = membership.roles.some(role => ["FACULTY", "CLASS_COORDINATOR", "CR", "CLUB_LEAD", "CORE_TEAM"].includes(role));
  if (manage && !canManage) fail(403, "You cannot manage content in this space.");
  return { space, membership, canManage };
}
