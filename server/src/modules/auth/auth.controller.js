import { randomBytes } from "node:crypto";
import { registerUser, verifyUserEmail, resendVerificationCode, authenticateUser } from "./auth.service.js";
import { establishUserSession, destroySession, saveSession } from "./auth.session.js";
import { toPublicUser } from "../users/user.utils.js";
import { SESSION_COOKIE_NAME } from "../../config/session.js";
import { disconnectSession } from "../../realtime/socket.js";

export async function register(req, res) {
  const { user, emailSent } = await registerUser(req.validated);
  res.status(201).json({ success: true, message: emailSent ? "Account created. Please verify your email." : "Account created, but email delivery failed. Please request another code.", data: { user: toPublicUser(user), emailSent } });
}
async function signedIn(req, res, user) {
  await establishUserSession(req, user._id);
  req.session.version = user.sessionVersion || 0;
  req.session.loginAt = Date.now();
  req.session.csrfToken = randomBytes(32).toString("hex");
  await saveSession(req);
  res.json({ success: true, data: { user: toPublicUser(user), csrfToken: req.session.csrfToken } });
}
export async function verifyEmail(req, res) { await signedIn(req, res, await verifyUserEmail(req.validated)); }
export async function login(req, res) { await signedIn(req, res, await authenticateUser(req.validated)); }
export async function resendCode(req, res) {
  await resendVerificationCode(req.validated);
  res.json({ success: true, message: "If an unverified account is eligible, a new code has been sent. Allow 30 seconds between requests." });
}
export async function logout(req, res) {
  disconnectSession(req.sessionID);
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ success: true });
}
