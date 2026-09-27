import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { requireSpace } from "../spaces/space.service.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
const schema = new mongoose.Schema({ spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true }, createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, question: { type: String, required: true }, options: [{ text: { type: String, required: true } }], closesAt: Date, status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" } }, { timestamps: true });
const voteSchema = new mongoose.Schema({ pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, optionId: { type: mongoose.Schema.Types.ObjectId, required: true } }, { timestamps: true });
voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
export const Poll = mongoose.model("Poll", schema), Vote = mongoose.model("Vote", voteSchema);
const router = Router({ mergeParams: true });
router.use(requireAuth, requireActive);
router.use(async (req, res, next) => { req.access = await requireSpace(req.user._id, req.params.spaceId); if (req.access.space.type !== "CLASS") fail(404, "Polls are available in class spaces."); next(); });
router.get("/", async (req, res) => {
  const records = await Poll.find({ spaceId: req.params.spaceId }).sort({ createdAt: -1 }).limit(50).lean();
  const votes = await Vote.find({ pollId: { $in: records.map(r => r._id) } }).lean();
  res.json({ data: records.map(record => ({ ...record, closed: record.status === "CLOSED" || (record.closesAt && record.closesAt <= new Date()), myVote: votes.find(v => String(v.pollId) === String(record._id) && String(v.userId) === String(req.user._id))?.optionId, options: record.options.map(o => ({ ...o, count: votes.filter(v => String(v.pollId) === String(record._id) && String(v.optionId) === String(o._id)).length })) })) });
});
router.post("/", async (req, res) => {
  if (!req.access.canManage) fail(403, "Only class representatives and coordinators can create polls.");
  const input = z.object({ question: z.string().trim().min(5).max(200), options: z.array(z.string().trim().min(1).max(100)).min(2).max(8), closesAt: z.coerce.date().optional() }).parse(req.body);
  if (new Set(input.options).size !== input.options.length || (input.closesAt && input.closesAt <= new Date())) fail(400, "Use distinct options and a future closing time.");
  res.status(201).json({ data: await Poll.create({ ...input, options: input.options.map(text => ({ text })), spaceId: req.params.spaceId, createdById: req.user._id }) });
});
router.put("/:itemId/vote", async (req, res) => {
  const pollId = id.parse(req.params.itemId), optionId = id.parse(req.body.optionId);
  await mongoose.connection.transaction(async session => {
    const poll = await Poll.findOneAndUpdate({ _id: pollId, spaceId: req.params.spaceId, status: "OPEN", "options._id": optionId, $or: [{ closesAt: null }, { closesAt: { $gt: new Date() } }] }, { $inc: { __v: 1 } }, { session, returnDocument: "after" });
    if (!poll) fail(400, "This poll is closed or the selected option is invalid.");
    await Vote.updateOne({ pollId, userId: req.user._id }, { $set: { optionId } }, { upsert: true, session });
  });
  res.json({ success: true });
});
router.put("/:itemId/close", async (req, res) => {
  if (!req.access.canManage) fail(403, "Only class representatives and coordinators can close polls.");
  await Poll.updateOne({ _id: id.parse(req.params.itemId), spaceId: req.params.spaceId }, { $set: { status: "CLOSED" } });
  res.json({ success: true });
});
export default router;
