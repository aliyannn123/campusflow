import User from "../modules/users/user.model.js";
import { fail } from "../lib/errors.js";

export async function requireAuth(req, res, next) {
  if (!req.session?.userId) fail(401, "Please log in to continue.");
  const user = await User.findById(req.session.userId);
  if (req.session.version !== (user?.sessionVersion || 0) || !req.session.loginAt || Date.now() - req.session.loginAt > 7 * 24 * 60 * 60 * 1000) fail(401, "Your session has expired. Please log in again.");
  if (!user || !user.emailVerified || user.accountStatus === "SUSPENDED") fail(401, "Your session is no longer valid. Please log in again.");
  req.user = user;
  next();
}

export function requireActive(req, res, next) {
  if (req.user.accountStatus !== "ACTIVE") fail(403, "Your account is awaiting administrator approval.");
  if (!req.user.onboardingCompleted) fail(403, "Complete your academic profile first.");
  next();
}

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user.globalRoles.some(role => roles.includes(role))) fail(403, "You do not have permission to do this.");
  next();
};
