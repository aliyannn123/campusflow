import { getOrganization } from "../organization/organization.service.js";
import { Router } from "express";
import { DateTime } from "luxon";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { accessibleSpaces } from "../spaces/space.service.js";
import Assignment from "../assignments/assignment.model.js";
import AssignmentProgress from "../assignments/assignment-progress.model.js";
import Announcement from "../announcements/announcement.model.js";
import Notification from "../notifications/notification.model.js";
import Membership from "../spaces/membership.model.js";
import { calendar } from "../calendar/calendar.service.js";
import { id } from "../../lib/validation.js";
import { z } from "zod";
import { fail } from "../../lib/errors.js";
import Question from "../doubts/question.model.js";
import User from "../users/user.model.js";
const router = Router();
router.use(requireAuth, requireActive);
router.get("/organization", async (req, res) => { const { name, shortName, logoFileId } = await getOrganization(); res.json({ data: { name, shortName, logoFileId } }); });
router.get("/calendar", async (req, res) => {
  const from = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.from);
  const to = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.to);
  res.json({ data: await calendar(req.user._id, from, to) });
});
router.get("/dashboard", async (req, res) => {
  const spaces = await accessibleSpaces(req.user._id);
  const ids = spaces.map(s => s._id);
  const completed = await AssignmentProgress.find({ userId: req.user._id, status: "COMPLETED" }).select("assignmentId");
  const zone = (await getOrganization()).timezone;
  const today = DateTime.now().setZone(zone);
  const [assignments, announcements, agenda] = await Promise.all([
    Assignment.find({ spaceId: { $in: ids }, status: "ACTIVE", _id: { $nin: completed.map(p => p.assignmentId) } }).sort({ dueAt: 1 }).limit(8).lean(),
    Announcement.find({ spaceId: { $in: ids }, status: "ACTIVE" }).sort({ createdAt: -1 }).limit(6).lean(),
    calendar(req.user._id, today.toISODate(), today.plus({ days: 7 }).toISODate()),
  ]);
  let faculty = null;
  if (req.user.requestedAccountType === "FACULTY") {
    const subjectIds = spaces.filter(s => s.type === "SUBJECT" && s.roles.includes("FACULTY")).map(s => s._id);
    const students = await User.find({ accountStatus: "ACTIVE", requestedAccountType: "STUDENT" }).select("_id");
    const enrolled = await Membership.find({ spaceId: { $in: subjectIds }, status: "ACTIVE", userId: { $in: students.map(u => u._id) } }).lean();
    const pendingDoubts = await Question.find({ spaceId: { $in: subjectIds }, status: "OPEN" }).sort({ createdAt: 1 }).limit(10).lean();
    const completion = await Promise.all(assignments.filter(a => subjectIds.some(s => String(s) === String(a.spaceId))).map(async assignment => {
      const userIds = enrolled.filter(m => String(m.spaceId) === String(assignment.spaceId)).map(m => m.userId);
      return { assignmentId: assignment._id, completed: await AssignmentProgress.countDocuments({ assignmentId: assignment._id, userId: { $in: userIds }, status: "COMPLETED" }), total: userIds.length };
    }));
    faculty = { pendingDoubts, completion, studentCount: new Set(enrolled.map(m => String(m.userId))).size };
  }
  res.json({ data: { spaces, assignments, announcements, agenda, faculty } });
});
router.get("/notifications", async (req, res) => {
  const spaces = await accessibleSpaces(req.user._id);
  const filter = { recipientId: req.user._id, $or: [{ spaceId: null }, { spaceId: { $in: spaces.map(s => s._id) } }] };
  res.json({ data: await Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean(), unreadCount: await Notification.countDocuments({ ...filter, readAt: null }) });
});
router.put("/notifications/:itemId/read", async (req, res) => {
  await Notification.updateOne({ _id: id.parse(req.params.itemId), recipientId: req.user._id }, { $set: { readAt: new Date() } });
  res.json({ success: true });
});
router.put("/notifications/read-all", async (req, res) => { await Notification.updateMany({ recipientId: req.user._id, readAt: null }, { $set: { readAt: new Date() } }); res.json({ success: true }); });
router.get("/settings", async (req, res) => {
  const memberships = await Membership.find({ userId: req.user._id, status: "ACTIVE" }).populate({ path: "spaceId", match: { status: "ACTIVE" }, select: "name type" }).lean();
  res.json({ data: memberships.filter(m => m.spaceId) });
});
router.put("/settings/:spaceId", async (req, res) => {
  const notificationPreference = z.enum(["ALL", "IMPORTANT_ONLY", "MUTED"]).parse(req.body.notificationPreference);
  const result = await Membership.updateOne({ userId: req.user._id, spaceId: id.parse(req.params.spaceId), status: "ACTIVE" }, { $set: { notificationPreference } });
  if (!result.matchedCount) fail(404, "Membership not found.");
  res.json({ success: true });
});
export default router;
