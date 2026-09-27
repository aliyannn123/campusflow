import { accessibleSpaces } from "../spaces/space.service.js";
import { Router } from "express";
import { z } from "zod";
import { DateTime } from "luxon";
import Schedule from "./subject-schedule.model.js";
import Exception from "./schedule-exception.model.js";
import { requireSpace } from "../spaces/space.service.js";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { fail } from "../../lib/errors.js";
import { id } from "../../lib/validation.js";
import { notifySpace } from "../notifications/notification.service.js";
import { emitSpace } from "../../realtime/socket.js";
const router = Router({ mergeParams: true });
router.use(requireAuth, requireActive);
const minutes = z.coerce.number().int().min(0).max(1439);
const fields = z.object({ dayOfWeek: z.coerce.number().int().min(1).max(7), startMinutes: minutes, endMinutes: z.coerce.number().int().min(1).max(1440), location: z.string().trim().max(150).default(""), mode: z.enum(["OFFLINE", "ONLINE"]).default("OFFLINE"), meetingUrl: z.string().url().refine(v => /^https?:\/\//.test(v)).nullable().optional() }).refine(v => v.endMinutes > v.startMinutes, "End time must be after start time");
async function access(req, manage = false) {
  const result = await requireSpace(req.user._id, req.params.spaceId, { manage });
  if (manage && (result.space.type !== "SUBJECT" || !result.membership.roles.includes("FACULTY"))) fail(403, "Only assigned faculty can change the subject schedule.");
  return result;
}
router.get("/", async (req, res) => {
  const context = await access(req);
  const ids = context.space.type === "CLASS" ? (await accessibleSpaces(req.user._id)).filter(s => s.type === "SUBJECT" && String(s.sectionId) === String(context.space.sectionId)).map(s => s._id) : [req.params.spaceId];
  res.json({ data: { schedules: await Schedule.find({ spaceId: { $in: ids }, status: "ACTIVE" }).sort({ dayOfWeek: 1, startMinutes: 1 }).lean(), exceptions: await Exception.find({ spaceId: { $in: ids }, status: "ACTIVE" }).sort({ localDate: 1 }).limit(100).lean() } });
});
router.post("/", async (req, res) => {
  await access(req, true);
  const input = fields.parse(req.body);
  const record = await Schedule.create({ ...input, spaceId: req.params.spaceId, createdById: req.user._id });
  await notifySpace({ spaceId: record.spaceId, actorId: req.user._id, type: "SCHEDULE_CHANGE", sourceId: record._id, title: "Subject schedule updated", tab: "schedule" });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.delete("/:itemId", async (req, res) => {
  await access(req, true);
  const record = await Schedule.findOneAndUpdate({ _id: id.parse(req.params.itemId), spaceId: req.params.spaceId }, { $set: { status: "INACTIVE" } }, { returnDocument: "after" });
  if (!record) fail(404, "Schedule not found.");
  await Exception.updateMany({ scheduleId: record._id }, { $set: { status: "REMOVED" } });
  emitSpace(record.spaceId); res.json({ success: true });
});
router.post("/exceptions", async (req, res) => {
  await access(req, true);
  const input = z.object({ type: z.enum(["CANCELLED", "MOVED", "EXTRA"]), scheduleId: id.nullable().optional(), localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startMinutes: minutes.nullable().optional(), endMinutes: z.coerce.number().int().min(1).max(1440).nullable().optional(), location: z.string().trim().max(150).default(""), reason: z.string().trim().max(500).default("") }).parse(req.body);
  const date = DateTime.fromISO(input.localDate);
  if (!date.isValid) fail(400, "Choose a valid date.");
  if (input.type !== "CANCELLED" && (input.startMinutes == null || input.endMinutes == null || input.endMinutes <= input.startMinutes)) fail(400, "Supply a valid start and end time.");
  if (input.type !== "EXTRA") {
    const schedule = input.scheduleId && await Schedule.findOne({ _id: input.scheduleId, spaceId: req.params.spaceId, status: "ACTIVE" });
    if (!schedule || schedule.dayOfWeek !== date.weekday) fail(400, "Choose a scheduled occurrence on this date.");
    if (await Exception.exists({ scheduleId: schedule._id, localDate: input.localDate, status: "ACTIVE" })) fail(409, "An exception already exists for this occurrence.");
  } else input.scheduleId = null;
  const record = await Exception.create({ ...input, spaceId: req.params.spaceId, createdById: req.user._id });
  await notifySpace({ spaceId: record.spaceId, actorId: req.user._id, type: "SCHEDULE_CHANGE", sourceId: record._id, title: "Schedule change: " + input.localDate, tab: "schedule", priority: "IMPORTANT" });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.delete("/exceptions/:itemId", async (req, res) => {
  await access(req, true);
  const record = await Exception.findOneAndUpdate({ _id: id.parse(req.params.itemId), spaceId: req.params.spaceId }, { $set: { status: "REMOVED" } });
  if (!record) fail(404, "Exception not found.");
  emitSpace(record.spaceId); res.json({ success: true });
});
export default router;
