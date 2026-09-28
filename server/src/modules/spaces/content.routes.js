import Acknowledgement from "../announcements/acknowledgement.model.js";
import User from "../users/user.model.js";
import { acknowledgementStats } from "../notices/acknowledgement-stats.js";
import Membership from "./membership.model.js";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { requireSpace } from "./space.service.js";
import { fail } from "../../lib/errors.js";
import { id } from "../../lib/validation.js";
import Announcement from "../announcements/announcement.model.js";
import Message from "../messages/message.model.js";
import Question from "../doubts/question.model.js";
import Answer from "../doubts/answer.model.js";
import Resource from "../resources/resource.model.js";
import Bookmark from "../resources/bookmark.model.js";
import Assignment from "../assignments/assignment.model.js";
import AssignmentProgress from "../assignments/assignment-progress.model.js";
import { notifySpace, notifyUsers } from "../notifications/notification.service.js";
import { emitSpace } from "../../realtime/socket.js";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireActive);
router.use(async (req, res, next) => {
  req.access = await requireSpace(req.user._id, req.params.spaceId);
  next();
});
const title = z.string().trim().min(3).max(150);
const body = z.string().trim().min(1).max(5000);
const httpUrl = z.string().url().refine(value => ["http:", "https:"].includes(new URL(value).protocol), "Use an http or https URL");
function manager(req, subjectOnly = false) {
  if (!req.access.canManage) fail(403, "You cannot manage this content.");
  if (subjectOnly && (req.access.space.type !== "SUBJECT" || !req.access.membership.roles.includes("FACULTY"))) fail(403, "Only the assigned faculty can manage assignments.");
}
async function item(Model, req, extra = {}) {
  const record = await Model.findOne({ _id: id.parse(req.params.itemId), spaceId: req.params.spaceId, ...extra });
  if (!record) fail(404, "Item not found.");
  return record;
}
function ownOrManage(req, ownerId) { if (String(ownerId) !== String(req.user._id) && !req.access.canManage) fail(403, "You cannot change someone else's content."); }

router.get("/announcements", async (req, res) => {
  const records = await Announcement.find({ spaceId: req.params.spaceId, status: "ACTIVE" }).populate("authorId", "name").sort({ createdAt: -1 }).limit(100).lean();
  const acknowledgements = await Acknowledgement.find({ userId: req.user._id, announcementId: { $in: records.map(r => r._id) } }).lean();
  res.json({ data: records.map(record => ({ ...record, acknowledged: acknowledgements.some(a => String(a.announcementId) === String(record._id)) })) });
});
router.put("/announcements/:itemId/acknowledgement", async (req, res) => {
  const record = await item(Announcement, req, { status: "ACTIVE" });
  if (!record.acknowledgementRequired) fail(400, "This announcement does not require acknowledgement.");
  await Acknowledgement.updateOne({ announcementId: record._id, userId: req.user._id }, { $setOnInsert: { announcementId: record._id, userId: req.user._id } }, { upsert: true });
  emitSpace(record.spaceId); res.json({ success: true });
});
router.get("/announcements/:itemId/acknowledgements", async (req, res) => {
  manager(req);
  const record = await Announcement.findOne({ _id: id.parse(req.params.itemId), spaceId: req.params.spaceId }).select("+targetedUserIds");
  if (!record) fail(404, "Announcement not found.");
  res.json(await acknowledgementStats(record, Acknowledgement, "announcementId"));
});
router.post("/announcements", async (req, res) => {
  manager(req);
  const input = z.object({ title, body, priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"), acknowledgementRequired: z.boolean().default(false) }).parse(req.body);
  const members = await Membership.find({ spaceId: req.params.spaceId, status: "ACTIVE" }).select("userId");
  const targets = await User.find({ _id: { $in: members.map(m => m.userId) }, accountStatus: "ACTIVE", emailVerified: true }).select("_id");
  const record = await Announcement.create({ ...input, spaceId: req.params.spaceId, authorId: req.user._id, targetedUserIds: targets.map(u => u._id), targetedRecipientCount: targets.length });
  await notifySpace({ spaceId: record.spaceId, actorId: req.user._id, type: "ANNOUNCEMENT", title: record.title, sourceId: record._id, priority: record.priority, tab: "announcements" });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.delete("/announcements/:itemId", async (req, res) => { manager(req); const record = await item(Announcement, req); record.status = "REMOVED"; await record.save(); emitSpace(record.spaceId); res.json({ success: true }); });

router.get("/messages", async (req, res) => {
  const filter = { spaceId: req.params.spaceId };
  if (req.query.before) filter._id = { $lt: id.parse(req.query.before) };
  const records = await Message.find(filter).populate("senderId", "name").populate("replyToMessageId", "content status").sort({ _id: -1 }).limit(50).lean();
  res.json({ data: records.reverse(), nextCursor: records.length === 50 ? String(records[0]._id) : null });
});
router.post("/messages", async (req, res) => {
  const input = z.object({ content: z.string().trim().min(1).max(4000), replyToMessageId: id.nullable().optional(), mentionedUserIds: z.array(id).max(15).default([]) }).parse(req.body);
  if (input.replyToMessageId && !await Message.exists({ _id: input.replyToMessageId, spaceId: req.params.spaceId, status: "ACTIVE" })) fail(400, "Reply target is not available in this space.");
  input.mentionedUserIds = [...new Set(input.mentionedUserIds)];
  if (await Membership.countDocuments({ spaceId: req.params.spaceId, status: "ACTIVE", userId: { $in: input.mentionedUserIds } }) !== input.mentionedUserIds.length) fail(400, "Mention only active members of this space.");
  const record = await Message.create({ ...input, spaceId: req.params.spaceId, senderId: req.user._id });
  await notifyUsers({ userIds: input.mentionedUserIds, actorId: req.user._id, spaceId: record.spaceId, type: "MENTION", title: "You were mentioned in " + req.access.space.name, message: "A member mentioned you in a discussion.", sourceId: record._id, destination: "/spaces/" + record.spaceId + "/discussion" });
  if (input.replyToMessageId) {
    const target = await Message.findById(input.replyToMessageId);
    await notifyUsers({ userIds: [target.senderId], actorId: req.user._id, spaceId: record.spaceId, type: "REPLY", title: "New reply in " + req.access.space.name, message: "Someone replied to your message.", sourceId: record._id, destination: "/spaces/" + record.spaceId + "/discussion" });
  }
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.patch("/messages/:itemId", async (req, res) => {
  const record = await item(Message, req, { status: "ACTIVE" });
  if (String(record.senderId) !== String(req.user._id)) fail(403, "You can only edit your own messages.");
  record.content = z.string().trim().min(1).max(4000).parse(req.body.content);
  record.editedAt = new Date(); await record.save(); emitSpace(record.spaceId); res.json({ data: record });
});
router.delete("/messages/:itemId", async (req, res) => {
  const record = await item(Message, req); ownOrManage(req, record.senderId);
  await Message.updateOne({ _id: record._id }, { $set: { content: "", status: "DELETED", deletedAt: new Date(), reactions: [] } });
  emitSpace(record.spaceId); res.json({ success: true });
});
router.put("/messages/:itemId/reaction", async (req, res) => {
  const record = await item(Message, req, { status: "ACTIVE" });
  const emoji = z.enum(["👍", "❤️", "🎉", "🤔"]).parse(req.body.emoji);
  // A distinct per-user record avoids lost updates from simultaneous reactions.
  const { default: Reaction } = await import("../messages/reaction.model.js");
  await Reaction.updateOne({ messageId: record._id, userId: req.user._id, emoji }, { $setOnInsert: { messageId: record._id, userId: req.user._id, emoji } }, { upsert: true });
  emitSpace(record.spaceId); res.json({ success: true });
});
router.delete("/messages/:itemId/reaction", async (req, res) => {
  const record = await item(Message, req);
  const { default: Reaction } = await import("../messages/reaction.model.js");
  await Reaction.deleteOne({ messageId: record._id, userId: req.user._id, emoji: z.enum(["👍", "❤️", "🎉", "🤔"]).parse(req.body.emoji) });
  emitSpace(record.spaceId); res.json({ success: true });
});
router.get("/reactions", async (req, res) => {
  const ids = req.query.ids ? z.array(id).max(500).parse(String(req.query.ids).split(",")) : null;
  const messages = await Message.find({ spaceId: req.params.spaceId, status: "ACTIVE", ...(ids ? { _id: { $in: ids } } : {}) }).sort({ _id: -1 }).limit(ids ? 500 : 50).select("_id");
  const { default: Reaction } = await import("../messages/reaction.model.js");
  res.json({ data: await Reaction.find({ messageId: { $in: messages.map(m => m._id) } }).lean() });
});

router.get("/questions", async (req, res) => res.json({ data: await Question.find({ spaceId: req.params.spaceId }).populate("askedById", "name").sort({ createdAt: -1 }).limit(100).lean() }));
router.post("/questions", async (req, res) => {
  const input = z.object({ title: z.string().trim().min(5).max(180), body }).parse(req.body);
  const record = await Question.create({ ...input, spaceId: req.params.spaceId, askedById: req.user._id });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.get("/questions/:itemId/answers", async (req, res) => {
  const question = await item(Question, req);
  res.json({ data: await Answer.find({ questionId: question._id, status: "ACTIVE" }).populate("authorId", "name").sort({ createdAt: 1 }).limit(100).lean() });
});
router.post("/questions/:itemId/answers", async (req, res) => {
  const question = await item(Question, req);
  const record = await Answer.create({ questionId: question._id, spaceId: question.spaceId, authorId: req.user._id, body: body.parse(req.body.body) });
  await Question.updateOne({ _id: question._id }, { $inc: { answerCount: 1 } });
  await Question.updateOne({ _id: question._id, status: "OPEN" }, { $set: { status: "ANSWERED" } });
  await notifyUsers({ userIds: [question.askedById], actorId: req.user._id, spaceId: question.spaceId, type: "ANSWER", title: "New answer to your question", message: question.title, sourceId: record._id, destination: "/spaces/" + question.spaceId + "/doubts" });
  emitSpace(question.spaceId); res.status(201).json({ data: record });
});
router.put("/questions/:itemId/accepted-answer", async (req, res) => {
  const question = await item(Question, req); ownOrManage(req, question.askedById);
  const answerId = id.parse(req.body.answerId);
  if (!await Answer.exists({ _id: answerId, questionId: question._id, status: "ACTIVE" })) fail(400, "Choose an answer to this question.");
  question.acceptedAnswerId = answerId; question.status = "RESOLVED"; await question.save();
  emitSpace(question.spaceId); res.json({ data: question });
});

router.get("/resources", async (req, res) => {
  const records = await Resource.find({ spaceId: req.params.spaceId, status: "ACTIVE" }).populate("createdById", "name").sort({ createdAt: -1 }).limit(100).lean();
  const bookmarks = await Bookmark.find({ userId: req.user._id, targetType: "RESOURCE", targetId: { $in: records.map(r => r._id) } }).lean();
  res.json({ data: records.map(record => ({ ...record, bookmarked: bookmarks.some(b => String(b.targetId) === String(record._id)) })) });
});
router.post("/resources", async (req, res) => {
  manager(req);
  const input = z.object({ title, description: z.string().trim().max(2000).default(""), category: z.enum(["NOTES", "SLIDES", "REFERENCE", "RECORDING", "OTHER"]).default("OTHER"), url: httpUrl }).parse(req.body);
  const record = await Resource.create({ ...input, resourceType: "LINK", spaceId: req.params.spaceId, createdById: req.user._id });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.delete("/resources/:itemId", async (req, res) => { manager(req); const record = await item(Resource, req); record.status = "REMOVED"; await record.save(); emitSpace(record.spaceId); res.json({ success: true }); });
router.put("/resources/:itemId/bookmark", async (req, res) => { const record = await item(Resource, req, { status: "ACTIVE" }); await Bookmark.updateOne({ userId: req.user._id, targetType: "RESOURCE", targetId: record._id }, { $setOnInsert: { userId: req.user._id, targetType: "RESOURCE", targetId: record._id } }, { upsert: true }); res.json({ success: true }); });
router.delete("/resources/:itemId/bookmark", async (req, res) => { const record = await item(Resource, req); await Bookmark.deleteOne({ userId: req.user._id, targetType: "RESOURCE", targetId: record._id }); res.json({ success: true }); });

router.get("/assignments", async (req, res) => {
  const records = await Assignment.find({ spaceId: req.params.spaceId, status: "ACTIVE" }).sort({ dueAt: 1 }).limit(100).lean();
  const progress = await AssignmentProgress.find({ userId: req.user._id, assignmentId: { $in: records.map(r => r._id) } }).lean();
  res.json({ data: records.map(record => { const state = progress.find(p => String(p.assignmentId) === String(record._id))?.status || "PENDING"; return { ...record, progress: state, isOverdue: state !== "COMPLETED" && record.dueAt < new Date() }; }) });
});
router.post("/assignments", async (req, res) => {
  manager(req, true);
  const input = z.object({ title, instructions: body, dueAt: z.coerce.date(), priority: z.enum(["NORMAL", "IMPORTANT"]).default("NORMAL") }).parse(req.body);
  if (input.dueAt <= new Date()) fail(400, "Choose a future deadline.");
  const record = await Assignment.create({ ...input, spaceId: req.params.spaceId, createdById: req.user._id });
  await notifySpace({ spaceId: record.spaceId, actorId: req.user._id, type: "ASSIGNMENT", title: record.title, sourceId: record._id, priority: record.priority, tab: "assignments" });
  emitSpace(record.spaceId); res.status(201).json({ data: record });
});
router.patch("/assignments/:itemId", async (req, res) => {
  manager(req, true);
  const existing = await item(Assignment, req, { status: "ACTIVE" });
  const input = z.object({ title, instructions: body, dueAt: z.coerce.date(), priority: z.enum(["NORMAL", "IMPORTANT"]) }).partial().parse(req.body);
  if (input.dueAt && input.dueAt <= new Date()) fail(400, "Choose a future deadline.");
  const changed = input.dueAt && input.dueAt.getTime() !== existing.dueAt.getTime();
  const record = await Assignment.findOneAndUpdate({ _id: existing._id, updatedAt: existing.updatedAt, status: "ACTIVE" }, { $set: input }, { returnDocument: "after", runValidators: true });
  if (!record) fail(409, "Assignment changed. Refresh and try again.");
  if (changed) {
    const members = await Membership.find({ spaceId: record.spaceId, status: "ACTIVE", roles: "STUDENT" });
    await notifyUsers({ userIds: members.map(m => m.userId), actorId: req.user._id, spaceId: record.spaceId, type: "ASSIGNMENT", title: "Deadline changed: " + record.title, message: "The assignment deadline has changed to " + record.dueAt.toISOString(), priority: "IMPORTANT", sourceId: record._id, dedupeKey: "deadline:" + record._id + ":" + record.updatedAt.getTime(), destination: "/spaces/" + record.spaceId + "/assignments" });
  }
  emitSpace(record.spaceId); res.json({ data: record });
});
router.delete("/assignments/:itemId", async (req, res) => { manager(req, true); const record = await item(Assignment, req); record.status = "CANCELLED"; await record.save(); emitSpace(record.spaceId); res.json({ success: true }); });
router.put("/assignments/:itemId/progress", async (req, res) => {
  if (!req.access.membership.roles.includes("STUDENT")) fail(403, "Only students track assignment progress.");
  const record = await item(Assignment, req, { status: "ACTIVE" });
  const status = z.enum(["PENDING", "COMPLETED"]).parse(req.body.status);
  await AssignmentProgress.updateOne({ assignmentId: record._id, userId: req.user._id }, { $set: { status, completedAt: status === "COMPLETED" ? new Date() : null } }, { upsert: true });
  emitSpace(record.spaceId);
  res.json({ success: true });
});
export default router;
