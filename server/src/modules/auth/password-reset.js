import { createHash, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { z } from "zod";
import User from "../users/user.model.js";
import { email, password } from "../../lib/validation.js";
import { fail } from "../../lib/errors.js";
import { sendEmail } from "../../services/email.service.js";
import { disconnectUser } from "../../realtime/socket.js";
const digest = value => createHash("sha256").update(value).digest("hex");
export async function requestPasswordReset(req, res) {
  const address = email.parse(req.body.email);
  const user = await User.findOne({ email: address, emailVerified: true });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await User.updateOne({ _id: user._id }, { $set: { passwordResetHash: digest(token), passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    try { await sendEmail({ to: address, subject: "Reset your CampusFlow password", text: "Reset your password within 30 minutes: " + origin + "/reset-password?token=" + token + "\nIf you did not request this, ignore this email." }); }
    catch { console.error("Password reset email delivery failed."); }
  }
  res.json({ success: true, message: "If a verified account exists, password reset instructions have been sent." });
}
export async function resetPassword(req, res) {
  const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password }).parse(req.body);
  const filter = { passwordResetHash: digest(data.token), passwordResetExpiresAt: { $gt: new Date() } };
  if (!await User.exists(filter)) fail(400, "This reset link is invalid or expired.");
  const passwordHash = await argon2.hash(data.password);
  const user = await User.findOneAndUpdate(filter, { $set: { passwordHash }, $inc: { sessionVersion: 1 }, $unset: { passwordResetHash: "", passwordResetExpiresAt: "" } });
  if (!user) fail(400, "This reset link has already been used.");
  disconnectUser(user._id);
  res.json({ success: true, message: "Password updated. Please log in again." });
}
