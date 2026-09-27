import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { accessibleSpaces } from "../spaces/space.service.js";
import Message from "../messages/message.model.js";
import Resource from "../resources/resource.model.js";
import Assignment from "../assignments/assignment.model.js";
import Announcement from "../announcements/announcement.model.js";
import Question from "../doubts/question.model.js";
import Event from "../events/event.model.js";
import Notice from "../notices/notice.model.js";
import Placement from "../placements/placement.model.js";
import { audienceMatches } from "../campus/eligibility.js";
const router = Router();
router.use(requireAuth, requireActive);
router.get("/", async (req, res) => {
  const q = z.string().trim().min(2).max(100).parse(req.query.q);
  const type = z.enum(["ALL", "MESSAGE", "RESOURCE", "ASSIGNMENT", "ANNOUNCEMENT", "QUESTION", "EVENT", "NOTICE", "PLACEMENT"]).parse(req.query.type || "ALL");
  const literal = q.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(literal, "i");
  const spaces = await accessibleSpaces(req.user._id), ids = spaces.map(s => s._id);
  const results = [];
  for (const [kind, Model, fields, tab] of [
    ["MESSAGE", Message, ["content"], "discussion"], ["RESOURCE", Resource, ["title", "description"], "resources"],
    ["ASSIGNMENT", Assignment, ["title", "instructions"], "assignments"], ["ANNOUNCEMENT", Announcement, ["title", "body"], "announcements"], ["QUESTION", Question, ["title", "body"], "doubts"],
  ]) {
    if (type !== "ALL" && type !== kind) continue;
    const filter = { spaceId: { $in: ids }, $or: fields.map(field => ({ [field]: regex })) };
    if (kind !== "QUESTION") filter.status = "ACTIVE";
    const records = await Model.find(filter).sort({ createdAt: -1 }).limit(20).lean();
    results.push(...records.map(record => ({ id: String(record._id), type: kind, title: record.title || record.content.slice(0, 80), snippet: (record.body || record.description || record.instructions || record.content || "").slice(0, 200), destination: "/spaces/" + record.spaceId + "/" + tab })));
  }
  for (const [kind, Model, fields, path] of [["EVENT", Event, ["title", "description"], "events"], ["NOTICE", Notice, ["title", "body"], "notices"], ["PLACEMENT", Placement, ["companyName", "roleTitle"], "placements"]]) {
    if (type !== "ALL" && type !== kind) continue;
    const filter = { status: "ACTIVE", $or: fields.map(field => ({ [field]: regex })) };
    if (kind === "EVENT") filter.endAt = { $gte: new Date() };
    if (kind === "PLACEMENT") filter.deadlineAt = { $gt: new Date() };
    if (kind === "NOTICE") filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }];
    const records = await Model.find(filter).limit(100).lean();
    results.push(...records.filter(record => kind !== "NOTICE" || audienceMatches(req.user, record.audience)).slice(0, 20).map(record => ({ id: String(record._id), type: kind, title: record.title || record.companyName + " · " + record.roleTitle, snippet: (record.body || record.description || "").slice(0, 200), destination: "/campus/" + path })));
  }
  res.json({ data: results });
});
export default router;
