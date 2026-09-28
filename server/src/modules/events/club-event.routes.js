import { Router } from "express";
import { schemas } from "../admin/admin.schemas.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { requireSpace } from "../spaces/space.service.js";
import Club from "../clubs/club.model.js";
import Event from "./event.model.js";
import Membership from "../spaces/membership.model.js";
import Registration from "./event-registration.model.js";
import Department from "../academic/department.model.js";
import { notifyUsers } from "../notifications/notification.service.js";
import { emitSpace, emitUser } from "../../realtime/socket.js";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireActive, async (req, res, next) => {
  req.access = await requireSpace(req.user._id, req.params.spaceId);
  req.club = await Club.findOne({ spaceId: req.params.spaceId, status: "ACTIVE" });
  if (req.access.space.type !== "CLUB" || !req.club) fail(404, "Club not found.");
  next();
});
function manage(req) {
  if (!req.access.membership.roles.some(r => ["CLUB_LEAD", "CORE_TEAM"].includes(r))) fail(403, "Club leadership is required to manage events.");
}
async function input(req) {
  const data = schemas.events.parse({ ...req.body, organizerType: "CLUB", clubId: String(req.club._id) });
  if (data.endAt <= data.startAt) fail(400, "Event end must follow its start.");
  if (data.eligibility.departmentIds?.length && await Department.countDocuments({ _id: { $in: data.eligibility.departmentIds }, status: "ACTIVE" }) !== new Set(data.eligibility.departmentIds).size) fail(400, "Choose active departments.");
  return { ...data, spaceId: req.access.space._id };
}
router.get("/", async (req, res) => {
  const events = await Event.find({ clubId: req.club._id }).sort({ startAt: -1 }).limit(100).lean();
  const registrations = await Registration.find({ userId: req.user._id, status: "REGISTERED" }).lean();
  res.json({ data: events.map(event => ({ ...event, registered: registrations.some(r => String(r.eventId) === String(event._id)) })) });
});
router.post("/", async (req, res) => {
  manage(req); const data = await input(req);
  if (data.startAt <= new Date()) fail(400, "Choose a future start time.");
  const record = await Event.create({ ...data, createdById: req.user._id });
  const members = await Membership.find({ spaceId: record.spaceId, status: "ACTIVE" }).select("userId");
  await notifyUsers({ userIds: members.map(m => m.userId), actorId: req.user._id, spaceId: record.spaceId, type: "EVENT", title: record.title, message: "A new club event is available.", sourceId: record._id, destination: "/campus/events/" + record._id });
  emitSpace(req.params.spaceId);
  res.status(201).json({ data: record });
});
router.put("/:itemId", async (req, res) => {
  manage(req); const data = await input(req);
  const existing = await Event.findOne({ _id: id.parse(req.params.itemId), clubId: req.club._id });
  if (!existing) fail(404, "Club event not found.");
  if (existing.status === "CANCELLED") fail(409, "Create a new event instead of reopening a cancelled event.");
  const record = await Event.findOneAndUpdate({ _id: existing._id, status: "ACTIVE", ...(data.capacity == null ? {} : { registeredCount: { $lte: data.capacity } }) }, { $set: data }, { returnDocument: "after", runValidators: true });
  if (!record) fail(409, "The event changed or capacity is below existing registrations. Refresh and try again.");
  const registrations = await Registration.find({ eventId: record._id, status: "REGISTERED" });
  await notifyUsers({ userIds: registrations.map(r => r.userId), actorId: req.user._id, spaceId: record.spaceId, type: "EVENT", title: record.title, message: record.status === "CANCELLED" ? "This event has been cancelled." : "The event details have changed.", priority: "IMPORTANT", sourceId: record._id, dedupeKey: "event-update:" + record._id + ":" + record.updatedAt.getTime(), destination: "/campus/events/" + record._id });
  for (const r of registrations) emitUser(r.userId, "calendar:changed");
  emitSpace(record.spaceId);
  res.json({ data: record });
});
router.get("/:itemId/registrations", async (req, res) => {
  manage(req);
  if (!await Event.exists({ _id: id.parse(req.params.itemId), clubId: req.club._id })) fail(404, "Club event not found.");
  res.json({ data: await Registration.find({ eventId: req.params.itemId }).populate("userId", "name").lean() });
});
export default router;
