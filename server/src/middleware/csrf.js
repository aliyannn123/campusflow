import { randomBytes, timingSafeEqual } from "node:crypto";
import { fail } from "../lib/errors.js";
export function csrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const allowed = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  if (origin && origin !== allowed) fail(403, "Request origin is not allowed.");
  // Anonymous auth requests are restricted to JSON plus a trusted browser origin.
  if (req.session?.userId) {
    const supplied = Buffer.from(req.get("x-csrf-token") || "");
    const expected = Buffer.from(req.session.csrfToken || "");
    if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) fail(403, "Session token expired. Refresh the page and try again.");
  } else if (!req.is("application/json")) fail(415, "Send a JSON request.");
  next();
}
export function csrfToken(req) {
  req.session.csrfToken ||= randomBytes(32).toString("hex");
  return req.session.csrfToken;
}
