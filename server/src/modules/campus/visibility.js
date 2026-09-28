import Club from "../clubs/club.model.js";
import { accessibleSpaces } from "../spaces/space.service.js";

export async function eventVisibility(userId) {
  const spaces = await accessibleSpaces(userId);
  const clubs = await Club.find({ status: "ACTIVE", spaceId: { $in: spaces.filter(s => s.type === "CLUB").map(s => s._id) } }).select("_id spaceId").lean();
  return { $or: [{ organizerType: "CAMPUS" }, ...clubs.map(club => ({ organizerType: "CLUB", clubId: club._id, spaceId: club.spaceId }))] };
}

// Build database filters before pagination, including profiles with unknown eligibility.
export function audienceFilter(user, prefix = "audience") {
  const profile = user.requestedAccountType === "FACULTY" ? user.facultyProfile : user.academicProfile;
  return { $and: [["accountTypes", user.requestedAccountType], ["departmentIds", profile?.departmentId], ["years", profile?.year]].map(([key, value]) => ({ $or: [
    { [`${prefix}.${key}.0`]: { $exists: false } }, ...(value == null ? [] : [{ [`${prefix}.${key}`]: value }]),
  ] })) };
}
export function placementVisibility(user, { managers = true } = {}) {
  if (managers && user.globalRoles?.some(r => ["COLLEGE_ADMIN", "PLACEMENT_COORDINATOR"].includes(r))) return {};
  if (user.requestedAccountType !== "STUDENT") return { _id: { $in: [] } };
  const filter = audienceFilter(user, "eligibility"), p = user.academicProfile || {};
  if (p.graduationYear != null) filter.$and.push({ $or: [{ "eligibility.graduationYears.0": { $exists: false } }, { "eligibility.graduationYears": p.graduationYear }] });
  if (p.cgpa != null) filter.$and.push({ $or: [{ "eligibility.minCGPA": null }, { "eligibility.minCGPA": { $lte: p.cgpa } }] });
  if (p.activeBacklogs != null) filter.$and.push({ $or: [{ "eligibility.maxActiveBacklogs": null }, { "eligibility.maxActiveBacklogs": { $gte: p.activeBacklogs } }] });
  return filter;
}
