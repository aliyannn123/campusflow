import { listFilter, paginate } from "../../lib/pagination.js";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireActive, requireRoles } from "../../middleware/auth.js";
import { requireSpace } from "../spaces/space.service.js";
import Report from "./report.model.js";
import Audit from "./audit-log.model.js";
import Message from "../messages/message.model.js";
import LostFound from "../lost-found/lost-found-item.model.js";
import User from "../users/user.model.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { disconnectUser, emitSpace } from "../../realtime/socket.js";
export const reportRoutes = Router();
reportRoutes.use(requireAuth, requireActive);
reportRoutes.post("/", async (req, res) => {
  const input = z.object({ targetType: z.enum(["MESSAGE", "LOST_FOUND_ITEM"]), targetId: id, reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "PRIVACY", "OTHER"]), details: z.string().trim().max(1000).default("") }).parse(req.body);
  const Model = input.targetType === "MESSAGE" ? Message : LostFound;
  const record = await Model.findOne({ _id: input.targetId, status: { $nin: ["DELETED", "REMOVED"] } });
  if (!record) fail(404, "Content not found.");
  if (record.spaceId) await requireSpace(req.user._id, String(record.spaceId));
  if (await Report.exists({ reporterId: req.user._id, targetId: record._id, status: "OPEN" })) fail(409, "You have already reported this content.");
  const authorId = record.senderId || record.postedById;
  const report = await Report.create({ ...input, reporterId: req.user._id, spaceId: record.spaceId, targetAuthorId: authorId, targetSnapshot: { authorId, title: record.title || "", body: record.content || record.description } });
  res.status(201).json({ data: { id: report._id } });
});
export const moderationRoutes = Router();
moderationRoutes.use(requireAuth, requireActive, requireRoles("COLLEGE_ADMIN"));
moderationRoutes.get("/", async (req, res) => res.json(await paginate(Report, { ...listFilter(req.query, ["reason", "details"]), ...(req.query.status ? { status: z.enum(["OPEN", "RESOLVED"]).parse(req.query.status) } : {}) }, req.query)));
moderationRoutes.put("/:itemId", async (req, res) => {
  const input = z.object({ resolutionAction: z.enum(["DISMISSED", "CONTENT_REMOVED", "USER_SUSPENDED", "CONTENT_REMOVED_AND_USER_SUSPENDED"]), resolutionNote: z.string().trim().min(2).max(1000) }).parse(req.body);
  const report = await Report.findOne({ _id: id.parse(req.params.itemId), status: "OPEN" });
  if (!report) fail(404, "Open report not found.");
  if (input.resolutionAction.includes("USER_SUSPENDED")) {
    const target = await User.findById(report.targetAuthorId);
    if (target?.globalRoles.includes("COLLEGE_ADMIN")) fail(400, "Administrator accounts require a separate account review.");
    if (target) { target.accountStatus = "SUSPENDED"; target.sessionVersion++; await target.save(); disconnectUser(target._id); }
  }
  if (input.resolutionAction.includes("CONTENT_REMOVED")) {
    if (report.targetType === "MESSAGE") await Message.updateOne({ _id: report.targetId }, { $set: { content: "", status: "DELETED", deletedAt: new Date(), reactions: [] } });
    else await LostFound.updateOne({ _id: report.targetId }, { $set: { status: "REMOVED" } });
    if (report.spaceId) emitSpace(report.spaceId);
  }
  Object.assign(report, input, { status: "RESOLVED", resolvedAt: new Date(), resolvedById: req.user._id }); await report.save();
  await Audit.create({ actorUserId: req.user._id, action: "REPORT_RESOLVED", targetType: report.targetType, targetId: report.targetId, summary: input.resolutionAction });
  res.json({ success: true });
});
