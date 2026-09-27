import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { fail } from "../../lib/errors.js";
import { id } from "../../lib/validation.js";
import { audienceMatches, placementEligibility } from "./eligibility.js";
import Event from "../events/event.model.js";
import Registration from "../events/event-registration.model.js";
import Notice from "../notices/notice.model.js";
import Acknowledgement from "../notices/notice-acknowledgement.model.js";
import Placement from "../placements/placement.model.js";
import Tracking from "../placements/placement-tracking.model.js";
import LostFound from "../lost-found/lost-found-item.model.js";
const router = Router();
router.use(requireAuth, requireActive);
router.get("/events", async (req, res) => {
  const events = await Event.find({ status: "ACTIVE", endAt: { $gte: new Date() } }).sort({ startAt: 1 }).limit(100).lean();
  const registrations = await Registration.find({ userId: req.user._id, status: "REGISTERED" }).lean();
  res.json({ data: events.map(event => ({ ...event, eligible: audienceMatches(req.user, event.eligibility), registered: registrations.some(r => String(r.eventId) === String(event._id)) })) });
});
router.put("/events/:itemId/registration", async (req, res) => {
  const eventId = id.parse(req.params.itemId);
  await mongoose.connection.transaction(async session => {
    const event = await Event.findOne({ _id: eventId, status: "ACTIVE" }).session(session);
    if (!event) fail(404, "Event not found.");
    if (!event.registrationRequired || event.startAt <= new Date()) fail(400, "Registration is not open.");
    if (!audienceMatches(req.user, event.eligibility)) fail(403, "You are not eligible for this event.");
    const existing = await Registration.findOne({ eventId, userId: req.user._id }).session(session);
    if (existing?.status === "REGISTERED") return;
    const filter = { _id: eventId, status: "ACTIVE" };
    if (event.capacity != null) filter.registeredCount = { $lt: event.capacity };
    const reserved = await Event.updateOne(filter, { $inc: { registeredCount: 1 } }, { session });
    if (!reserved.modifiedCount) fail(409, "This event is full.");
    await Registration.updateOne({ eventId, userId: req.user._id }, { $set: { status: "REGISTERED", registeredAt: new Date(), cancelledAt: null } }, { upsert: true, session });
  });
  res.json({ success: true });
});
router.delete("/events/:itemId/registration", async (req, res) => {
  const eventId = id.parse(req.params.itemId);
  await mongoose.connection.transaction(async session => {
    const existing = await Registration.findOneAndUpdate({ eventId, userId: req.user._id, status: "REGISTERED" }, { $set: { status: "CANCELLED", cancelledAt: new Date() } }, { session });
    if (existing) await Event.updateOne({ _id: eventId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } }, { session });
  });
  res.json({ success: true });
});
router.get("/notices", async (req, res) => {
  const notices = await Notice.find({ status: "ACTIVE", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).sort({ createdAt: -1 }).limit(200).lean();
  const acknowledgements = await Acknowledgement.find({ userId: req.user._id }).lean();
  res.json({ data: notices.filter(n => audienceMatches(req.user, n.audience)).map(n => ({ ...n, acknowledged: acknowledgements.some(a => String(a.noticeId) === String(n._id)) })) });
});
router.put("/notices/:itemId/acknowledgement", async (req, res) => {
  const notice = await Notice.findOne({ _id: id.parse(req.params.itemId), status: "ACTIVE", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  if (!notice || !audienceMatches(req.user, notice.audience)) fail(404, "Notice not found.");
  if (!notice.acknowledgementRequired) fail(400, "This notice does not require acknowledgement.");
  await Acknowledgement.updateOne({ noticeId: notice._id, userId: req.user._id }, { $setOnInsert: { noticeId: notice._id, userId: req.user._id } }, { upsert: true });
  res.json({ success: true });
});
router.get("/placements", async (req, res) => {
  const records = await Placement.find({ status: "ACTIVE", deadlineAt: { $gt: new Date() } }).sort({ deadlineAt: 1 }).limit(100).lean();
  const tracking = await Tracking.find({ userId: req.user._id }).lean();
  res.json({ data: records.map(record => ({ ...record, eligibilityStatus: placementEligibility(req.user, record.eligibility), applied: tracking.some(t => String(t.placementId) === String(record._id)) })) });
});
router.put("/placements/:itemId/applied", async (req, res) => {
  const record = await Placement.findOne({ _id: id.parse(req.params.itemId), status: "ACTIVE", deadlineAt: { $gt: new Date() } });
  if (!record) fail(404, "Placement not found or applications closed.");
  if (placementEligibility(req.user, record.eligibility) !== "ELIGIBLE") fail(403, "Your profile does not confirm eligibility for this opportunity.");
  await Tracking.updateOne({ placementId: record._id, userId: req.user._id }, { $setOnInsert: { placementId: record._id, userId: req.user._id } }, { upsert: true });
  res.json({ success: true });
});
router.delete("/placements/:itemId/applied", async (req, res) => { await Tracking.deleteOne({ placementId: id.parse(req.params.itemId), userId: req.user._id }); res.json({ success: true }); });
const lostFields = z.object({ type: z.enum(["LOST", "FOUND"]), title: z.string().trim().min(3).max(180), description: z.string().trim().min(1).max(3000), category: z.enum(["ID_CARD", "ELECTRONICS", "KEYS", "BOOKS", "BAG", "ACCESSORIES", "CLOTHING", "OTHER"]).default("OTHER"), locationText: z.string().trim().max(200).default(""), occurredAt: z.coerce.date(), handoverNote: z.string().trim().max(500).default("") });
router.get("/lost-found", async (req, res) => {
  const filter = { status: { $in: ["OPEN", "RESOLVED"] } };
  if (req.query.type) filter.type = z.enum(["LOST", "FOUND"]).parse(req.query.type);
  if (req.query.q) { const q = z.string().max(100).parse(req.query.q); filter.$text = { $search: q }; }
  res.json({ data: await LostFound.find(filter).populate("postedById", "name").sort({ createdAt: -1 }).limit(100).lean() });
});
router.post("/lost-found", async (req, res) => {
  const input = lostFields.parse(req.body);
  if (input.occurredAt > new Date()) fail(400, "The occurrence date cannot be in the future.");
  res.status(201).json({ data: await LostFound.create({ ...input, postedById: req.user._id }) });
});
async function ownLost(req) {
  const record = await LostFound.findOne({ _id: id.parse(req.params.itemId), status: { $ne: "REMOVED" } });
  if (!record) fail(404, "Item not found.");
  if (String(record.postedById) !== String(req.user._id)) fail(403, "Only the owner can change this listing.");
  return record;
}
router.patch("/lost-found/:itemId", async (req, res) => { const record = await ownLost(req); Object.assign(record, lostFields.partial().parse(req.body)); await record.save(); res.json({ data: record }); });
router.put("/lost-found/:itemId/resolve", async (req, res) => { const record = await ownLost(req); record.status = "RESOLVED"; record.resolvedAt = new Date(); record.resolutionNote = z.string().trim().max(500).parse(req.body.resolutionNote || ""); await record.save(); res.json({ success: true }); });
router.delete("/lost-found/:itemId", async (req, res) => { const record = await ownLost(req); record.status = "REMOVED"; await record.save(); res.json({ success: true }); });
export default router;
