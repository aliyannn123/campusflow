import mongoose from "mongoose";
const schema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, enum: ["👍", "❤️", "🎉", "🤔"], required: true },
}, { timestamps: true });
schema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });
export default mongoose.model("Reaction", schema);
