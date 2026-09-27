import { Router } from "express";
import { z } from "zod";
import Department from "./department.model.js";
import Program from "./program.model.js";
import Section from "./section.model.js";
import { requireAuth } from "../../middleware/auth.js";
import { id } from "../../lib/validation.js";
const router = Router();
router.use(requireAuth);
router.get("/departments", async (req, res) => res.json({ data: await Department.find({ status: "ACTIVE" }).sort({ name: 1 }).lean() }));
router.get("/programs", async (req, res) => {
  const departmentId = id.parse(req.query.departmentId);
  res.json({ data: await Program.find({ departmentId, status: "ACTIVE" }).sort({ name: 1 }).lean() });
});
router.get("/sections", async (req, res) => {
  const programId = id.parse(req.query.programId);
  const filter = { programId, status: "ACTIVE" };
  for (const key of ["year", "semester"]) if (req.query[key]) filter[key] = z.coerce.number().int().min(1).max(20).parse(req.query[key]);
  res.json({ data: await Section.find(filter).sort({ year: 1, semester: 1, name: 1 }).lean() });
});
export default router;
