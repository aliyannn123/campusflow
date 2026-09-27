import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import File from "../modules/files/file-asset.model.js";
import Organization from "../modules/organization/organization.model.js";
import Resource from "../modules/resources/resource.model.js";
import Message from "../modules/messages/message.model.js";
import LostFound from "../modules/lost-found/lost-found-item.model.js";
import { deleteAsset } from "../modules/files/storage.js";
const models = { ORGANIZATION: Organization, RESOURCE: Resource, MESSAGE: Message, LOST_FOUND_ITEM: LostFound };
try {
  await connectDatabase();
  let count = 0;
  for await (const file of File.find({ updatedAt: { $lt: new Date(Date.now() - 86400000) } }).cursor()) {
    const Model = models[file.targetType];
    const target = Model && await Model.findOne({ _id: file.targetId, status: { $nin: ["REMOVED", "DELETED"] } });
    if (file.status === "DELETED" || !target) {
      await deleteAsset(file.storageKey, file.provider);
      await File.deleteOne({ _id: file._id });
      count++;
    }
  }
  console.log("Removed " + count + " expired file records and their stored objects.");
} finally { await mongoose.disconnect(); }
