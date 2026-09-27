import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { requireSpace } from "../spaces/space.service.js";
import { id } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import File from "./file-asset.model.js";
import Organization from "../organization/organization.model.js";
import Resource from "../resources/resource.model.js";
import Message from "../messages/message.model.js";
import LostFound from "../lost-found/lost-found-item.model.js";
import { writeAsset, readAsset, deleteAsset, storageProvider } from "./storage.js";
const router = Router();
router.use(requireAuth, requireActive);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 8 } });
const kinds = { ORGANIZATION: { Model: Organization, owner: "updatedById", purpose: "ORGANIZATION_LOGO" }, RESOURCE: { Model: Resource, owner: "createdById", purpose: "RESOURCE_ATTACHMENT" }, MESSAGE: { Model: Message, owner: "senderId", purpose: "MESSAGE_ATTACHMENT" }, LOST_FOUND_ITEM: { Model: LostFound, owner: "postedById", purpose: "LOST_FOUND_IMAGE" } };
async function target(req, type, targetId, write = false) {
  const config = kinds[type]; if (!config) fail(400, "Unsupported attachment type.");
  const record = await config.Model.findOne({ _id: id.parse(targetId), status: { $nin: ["REMOVED", "DELETED"] } });
  if (!record) fail(404, "Attachment target not found.");
  if (type === "ORGANIZATION") { if (write && !req.user.globalRoles.includes("COLLEGE_ADMIN")) fail(403, "Only college administrators can change the logo."); return record; }
  let access;
  if (record.spaceId) access = await requireSpace(req.user._id, String(record.spaceId));
  if (write && !(type === "RESOURCE" ? access?.canManage : String(record[config.owner]) === String(req.user._id))) fail(403, "You cannot attach files to this item.");
  return record;
}
async function saveFile(req, record, type) {
  if (!req.file) fail(400, "Choose a file.");
  const detected = await fileTypeFromBuffer(req.file.buffer);
  const allowed = ["LOST_FOUND_ITEM", "ORGANIZATION"].includes(type) ? ["png", "jpg", "webp"] : ["png", "jpg", "webp", "pdf", "docx", "xlsx", "pptx"];
  if (!detected || !allowed.includes(detected.ext)) fail(400, "Unsupported file. Use PDF, Office documents, PNG, JPEG or WebP; item photos must be images.");
  const key = randomUUID() + "." + detected.ext;
  await writeAsset(key, req.file.buffer, detected.mime);
  try {
    return await File.create({ uploadedById: req.user._id, provider: storageProvider(), storageKey: key, originalName: req.file.originalname.replace(/[\r\n]/g, "").slice(0, 200), mimeType: detected.mime, extension: detected.ext, sizeBytes: req.file.size, purpose: kinds[type].purpose, targetType: type, targetId: record._id, spaceId: record.spaceId || null });
  } catch (error) { await deleteAsset(key, storageProvider()); throw error; }
}
router.post("/resources/:spaceId", async (req, res, next) => { await requireSpace(req.user._id, req.params.spaceId, { manage: true }); next(); }, upload.single("file"), async (req, res) => {
  const title = z.string().trim().min(3).max(180).parse(req.body.title);
  let record;
  try {
    record = await Resource.create({ title, resourceType: "FILE", spaceId: req.params.spaceId, createdById: req.user._id });
    const file = await saveFile(req, record, "RESOURCE");
    res.status(201).json({ data: { resource: record, file: { id: file._id, originalName: file.originalName } } });
  } catch (error) { if (record) await Resource.deleteOne({ _id: record._id }); throw error; }
});
router.post("/:targetType/:targetId", async (req, res, next) => { req.targetRecord = await target(req, req.params.targetType, req.params.targetId, true); next(); }, upload.single("file"), async (req, res) => {
  const count = await File.countDocuments({ targetType: req.params.targetType, targetId: req.params.targetId, status: "ACTIVE" });
  if (count >= 5) fail(400, "This item already has five attachments.");
  const file = await saveFile(req, req.targetRecord, req.params.targetType);
  if (req.params.targetType === "ORGANIZATION") { await Organization.updateOne({ _id: req.targetRecord._id }, { $set: { logoFileId: file._id, updatedById: req.user._id } }); await File.updateMany({ targetType: "ORGANIZATION", targetId: req.targetRecord._id, _id: { $ne: file._id } }, { $set: { status: "DELETED" } }); }
  res.status(201).json({ data: { id: file._id, originalName: file.originalName } });
});
router.get("/for/:targetType/:targetId", async (req, res) => {
  await target(req, req.params.targetType, req.params.targetId);
  res.json({ data: await File.find({ targetType: req.params.targetType, targetId: req.params.targetId, status: "ACTIVE" }).select("originalName mimeType sizeBytes").lean() });
});
router.get("/:fileId", async (req, res) => {
  const file = await File.findOne({ _id: id.parse(req.params.fileId), status: "ACTIVE" });
  if (!file) fail(404, "File not found.");
  await target(req, file.targetType, String(file.targetId));
  res.set("Cache-Control", "private, no-store"); res.set("X-Content-Type-Options", "nosniff"); if (file.targetType !== "ORGANIZATION") res.attachment(file.originalName); res.type(file.mimeType);
  res.send(Buffer.from(await readAsset(file.storageKey, file.provider)));
});
router.delete("/:fileId", async (req, res) => {
  const file = await File.findOne({ _id: id.parse(req.params.fileId), status: "ACTIVE" });
  if (!file) fail(404, "File not found.");
  await target(req, file.targetType, String(file.targetId), true);
  file.status = "DELETED"; await file.save();
  await deleteAsset(file.storageKey, file.provider);
  res.json({ success: true });
});
export default router;
