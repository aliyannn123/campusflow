import { Router } from "express";
import { z } from "zod";
import Club from "./club.model.js";
import Membership from "../spaces/membership.model.js";
import { requireSpace } from "../spaces/space.service.js";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
const router = Router();
router.use(requireAuth, requireActive);
router.get("/", async (req, res) => {
  const clubs = await Club.find({ status: "ACTIVE" }).sort({ name: 1 }).limit(100).lean();
  const memberships = await Membership.find({ userId: req.user._id, spaceId: { $in: clubs.map(c => c.spaceId) } }).lean();
  res.json({ data: clubs.map(club => ({ ...club, membership: memberships.find(m => String(m.spaceId) === String(club.spaceId)) || null })) });
});
async function club(req) { const record = await Club.findOne({ _id: id.parse(req.params.clubId), status: "ACTIVE" }); if (!record) fail(404, "Club not found."); return record; }
router.post("/:clubId/join", async (req, res) => {
  const record = await club(req);
  const current = await Membership.findOne({ spaceId: record.spaceId, userId: req.user._id });
  if (current && ["ACTIVE", "PENDING"].includes(current.status)) return res.json({ data: current });
  const membership = await Membership.findOneAndUpdate({ spaceId: record.spaceId, userId: req.user._id }, { $set: { status: record.joinPolicy === "OPEN" ? "ACTIVE" : "PENDING", roles: ["MEMBER"] } }, { upsert: true, returnDocument: "after" });
  res.json({ data: membership });
});
router.delete("/:clubId/membership", async (req, res) => {
  const record = await club(req);
  const membership = await Membership.findOne({ spaceId: record.spaceId, userId: req.user._id });
  if (membership?.roles.includes("CLUB_LEAD")) fail(409, "Ask an administrator to transfer club leadership before leaving.");
  await Membership.updateOne({ spaceId: record.spaceId, userId: req.user._id }, { $set: { status: "INACTIVE", roles: ["MEMBER"] } });
  res.json({ success: true });
});
router.get("/:clubId/requests", async (req, res) => {
  const record = await club(req); await requireSpace(req.user._id, String(record.spaceId), { manage: true });
  res.json({ data: await Membership.find({ spaceId: record.spaceId, status: "PENDING" }).populate("userId", "name").lean() });
});
router.put("/:clubId/requests/:userId", async (req, res) => {
  const record = await club(req); await requireSpace(req.user._id, String(record.spaceId), { manage: true });
  const status = z.enum(["ACTIVE", "INACTIVE"]).parse(req.body.status);
  await Membership.updateOne({ spaceId: record.spaceId, userId: id.parse(req.params.userId), status: "PENDING" }, { $set: { status } });
  res.json({ success: true });
});
export default router;
