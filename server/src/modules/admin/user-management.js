import { z } from "zod";
import User from "../users/user.model.js";
import Department from "../academic/department.model.js";
import Program from "../academic/program.model.js";
import Section from "../academic/section.model.js";
import Offering from "../academic/subject-offering.model.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { syncAcademicMemberships } from "../spaces/space.service.js";
import { toPublicUser } from "../users/user.utils.js";
import { disconnectUser } from "../../realtime/socket.js";
import Audit from "../moderation/audit-log.model.js";
const text = z.string().trim().max(100).default("");
const student = z.object({ departmentId: id, programId: id, sectionId: id, studentId: text, graduationYear: z.coerce.number().int().min(2020).max(2100).nullable().default(null), cgpa: z.coerce.number().min(0).max(10).nullable().default(null), activeBacklogs: z.coerce.number().int().min(0).max(100).nullable().default(null) });
const faculty = z.object({ departmentId: id, designation: z.string().trim().min(2).max(100), facultyId: text });
export async function updateAcademicProfile(req, res) {
  const user = await User.findById(id.parse(req.params.itemId));
  if (!user) fail(404, "User not found.");
  const input = (user.requestedAccountType === "STUDENT" ? student : faculty).parse(req.body);
  if (!await Department.exists({ _id: input.departmentId, status: "ACTIVE" })) fail(400, "Choose an active department.");
  if (user.requestedAccountType === "STUDENT") {
    const program = await Program.findOne({ _id: input.programId, departmentId: input.departmentId, status: "ACTIVE" });
    const section = program && await Section.findOne({ _id: input.sectionId, programId: program._id, status: "ACTIVE" });
    if (!section) fail(400, "Choose a section in the selected program and department.");
    user.academicProfile = { ...input, year: section.year, semester: section.semester };
  } else {
    if (String(user.facultyProfile?.departmentId) !== input.departmentId && await Offering.exists({ primaryFacultyId: user._id, status: "ACTIVE" })) fail(409, "Reassign this faculty member's active offerings before changing departments.");
    user.facultyProfile = input;
  }
  await syncAcademicMemberships(user);
  user.onboardingCompleted = true;
  user.sessionVersion += 1;
  await user.save();
  disconnectUser(user._id);
  await Audit.create({ actorUserId: req.user._id, action: "USER_ACADEMIC_PROFILE", targetType: "USER", targetId: user._id });
  res.json({ data: toPublicUser(user) });
}
