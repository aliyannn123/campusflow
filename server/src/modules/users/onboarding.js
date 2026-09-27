import { z } from "zod";
import Department from "../academic/department.model.js";
import Program from "../academic/program.model.js";
import Section from "../academic/section.model.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { toPublicUser } from "./user.utils.js";
import { syncAcademicMemberships } from "../spaces/space.service.js";

const studentSchema = z.object({
  departmentId: id, programId: id, sectionId: id,
  studentId: z.string().trim().max(100).optional(),
});
const facultySchema = z.object({
  departmentId: id, designation: z.string().trim().min(2).max(100),
  facultyId: z.string().trim().max(100).optional(),
});
export async function onboard(req, res) {
  const user = req.user;
  if (user.onboardingCompleted) fail(409, "Your academic profile is already complete. Contact an administrator to change it.");
  const profile = (user.requestedAccountType === "STUDENT" ? studentSchema : facultySchema).parse(req.body);
  if (!await Department.exists({ _id: profile.departmentId, status: "ACTIVE" })) fail(400, "Choose an active department.");
  if (user.requestedAccountType === "STUDENT") {
    const program = await Program.findOne({ _id: profile.programId, departmentId: profile.departmentId, status: "ACTIVE" });
    const section = program && await Section.findOne({ _id: profile.sectionId, programId: program._id, status: "ACTIVE" });
    if (!section) fail(400, "Choose a section belonging to the selected program and department.");
    user.academicProfile = { ...profile, year: section.year, semester: section.semester };
  } else {
    user.facultyProfile = profile;
  }
  await syncAcademicMemberships(user);
  user.onboardingCompleted = true;
  await user.save();
  res.json({ data: { user: toPublicUser(user) } });
}
