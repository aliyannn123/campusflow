import mongoose from "mongoose";
const schema = new mongoose.Schema({
  announcementId: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
schema.index({ announcementId: 1, userId: 1 }, { unique: true });
export default mongoose.model("AnnouncementAcknowledgement", schema);
