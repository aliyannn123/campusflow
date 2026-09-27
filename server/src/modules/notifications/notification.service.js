import Notification from "./notification.model.js";
import Membership from "../spaces/membership.model.js";
import User from "../users/user.model.js";
import { emitUser } from "../../realtime/socket.js";
export async function notifyUsers({ userIds, actorId, spaceId, type, title, message, sourceId, destination, priority = "NORMAL", dedupeKey = type + ":" + sourceId }) {
  const users = await User.find({ _id: { $in: [...new Set(userIds.map(String))] }, accountStatus: "ACTIVE", emailVerified: true }).select("_id");
  for (const user of users) {
    const userId = String(user._id);
    if (userId === String(actorId)) continue;
    if (spaceId) {
      const membership = await Membership.findOne({ userId, spaceId, status: "ACTIVE" });
      if (!membership || membership.notificationPreference === "MUTED" || (membership.notificationPreference === "IMPORTANT_ONLY" && priority === "NORMAL")) continue;
    }
    const result = await Notification.updateOne({ recipientId: userId, dedupeKey }, { $setOnInsert: { recipientId: userId, dedupeKey, actorId, spaceId, type, title: title.slice(0, 180), message: message.slice(0, 1000), sourceId, sourceType: type, destination, priority } }, { upsert: true });
    if (result.upsertedCount) emitUser(userId, "notifications:changed");
  }
}
export async function notifySpace({ spaceId, actorId, type, title, sourceId, priority = "NORMAL", tab }) {
  const memberships = await Membership.find({ spaceId, status: "ACTIVE" });
  await notifyUsers({ userIds: memberships.map(m => m.userId), actorId, spaceId, type, title, message: title, sourceId, priority, destination: "/spaces/" + spaceId + "/" + tab });
}
