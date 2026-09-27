import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import Department from "../modules/academic/department.model.js";
import Program from "../modules/academic/program.model.js";
import Section from "../modules/academic/section.model.js";
import Subject from "../modules/academic/subject.model.js";
import SubjectOffering from "../modules/academic/subject-offering.model.js";
import User from "../modules/users/user.model.js";
import { syncAcademicMemberships } from "../modules/spaces/space.service.js";

try {
  await connectDatabase();
  for (const [shortName, name] of [["AIML", "Artificial Intelligence & Machine Learning"], ["CSE", "Computer Science & Engineering"]]) {
    const department = await Department.findOneAndUpdate({ name }, { $setOnInsert: { name, shortName } }, { upsert: true, returnDocument: "after" });
    const program = await Program.findOneAndUpdate({ departmentId: department._id, name: "B.Tech " + shortName }, { $setOnInsert: { departmentId: department._id, name: "B.Tech " + shortName, shortName, durationYears: 4 } }, { upsert: true, returnDocument: "after" });
    for (let semester = 1; semester <= 8; semester++) {
      for (const sectionName of ["A", "B"]) {
        const year = Math.ceil(semester / 2);
        const section = await Section.findOneAndUpdate({ programId: program._id, year, semester, name: sectionName }, { $setOnInsert: { programId: program._id, year, semester, name: sectionName } }, { upsert: true, returnDocument: "after" });
        if (semester === 5) for (const [code, subjectName] of [["501", "Database Management Systems"], ["502", "Operating Systems"], ["503", "Computer Networks"]]) {
          const subject = await Subject.findOneAndUpdate({ code: shortName + code }, { $setOnInsert: { departmentId: department._id, code: shortName + code, name: subjectName } }, { upsert: true, returnDocument: "after" });
          const academicYear = process.env.ACADEMIC_YEAR || "2026-2027";
          await SubjectOffering.findOneAndUpdate({ subjectId: subject._id, sectionId: section._id, academicYear }, { $setOnInsert: { subjectId: subject._id, sectionId: section._id, programId: program._id, academicYear, year, semester } }, { upsert: true });
        }
      }
    }
  }
  for await (const user of User.find({ onboardingCompleted: true, accountStatus: "ACTIVE" }).cursor()) await syncAcademicMemberships(user);
  console.log("Sample academic structure seeded. Existing records were preserved.");
} finally { await mongoose.disconnect(); }
