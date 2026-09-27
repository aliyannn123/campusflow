import { getOrganization } from "../organization/organization.service.js";
import * as argon2 from "argon2";
import User from "../users/user.model.js";
import { fail } from "../../lib/errors.js";
import { createVerificationChallenge, hashVerificationCode, MAX_VERIFICATION_ATTEMPTS, VERIFICATION_RESEND_COOLDOWN_MS } from "./verification-code.js";
import { sendVerificationEmail } from "../../services/email.service.js";

const normalizeEmail = email => email.trim().toLowerCase();
const challengeFields = challenge => ({
  emailVerificationCodeHash: challenge.codeHash,
  emailVerificationExpiresAt: challenge.expiresAt,
  emailVerificationAttempts: 0,
  emailVerificationLastSentAt: new Date(),
});

export async function registerUser({ name, email, accountType, password }) {
  email = normalizeEmail(email);
  const organization = await getOrganization();
  const domain = organization.allowedEmailDomain;
  if (accountType === "STUDENT" && !organization.studentRegistrationEnabled) fail(403, "Student registration is currently closed.");
  if (!domain) throw new Error("ALLOWED_EMAIL_DOMAIN is not configured.");
  if (email.split("@")[1] !== domain) fail(400, "Please use your institutional college email.");
  if (await User.exists({ email })) fail(409, "An account with this email already exists.");
  const challenge = createVerificationChallenge();
  const user = await User.create({
    name: name.trim(), email, passwordHash: await argon2.hash(password),
    globalRoles: [accountType], requestedAccountType: accountType,
    ...challengeFields(challenge),
  });
  let emailSent = false;
  try {
    await sendVerificationEmail({ to: email, code: challenge.code });
    emailSent = true;
  } catch {
    console.error("Verification delivery failed; user can request another code.");
  }
  return { user, emailSent };
}

export async function verifyUserEmail({ email, code }) {
  email = normalizeEmail(email);
  const codeHash = hashVerificationCode(code);
  // Claim a single attempt atomically, including successful attempts.
  const challenge = await User.findOneAndUpdate({
    email, emailVerified: false,
    emailVerificationExpiresAt: { $gt: new Date() },
    emailVerificationAttempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
    emailVerificationCodeHash: { $exists: true },
  }, { $inc: { emailVerificationAttempts: 1 } }, { returnDocument: "after" }).select("+emailVerificationCodeHash");
  if (!challenge) fail(400, "Code expired, already used, or attempts exhausted. Request a new code.");
  if (challenge.emailVerificationCodeHash !== codeHash) fail(400, "Incorrect verification code.");
  const user = await User.findOneAndUpdate({
    _id: challenge._id, emailVerified: false, emailVerificationCodeHash: codeHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  }, {
    $set: { emailVerified: true, accountStatus: challenge.requestedAccountType === "FACULTY" ? "PENDING_APPROVAL" : "ACTIVE" },
    $unset: { emailVerificationCodeHash: "", emailVerificationExpiresAt: "", emailVerificationAttempts: "", emailVerificationLastSentAt: "" },
  }, { returnDocument: "after" });
  if (!user) fail(400, "This code has already been used or replaced. Please log in.");
  return user;
}

export async function resendVerificationCode({ email }) {
  email = normalizeEmail(email);
  const challenge = createVerificationChallenge();
  const user = await User.findOneAndUpdate({
    email, emailVerified: false,
    $or: [{ emailVerificationLastSentAt: { $lte: new Date(Date.now() - VERIFICATION_RESEND_COOLDOWN_MS) } }, { emailVerificationLastSentAt: { $exists: false } }],
  }, { $set: challengeFields(challenge) }, { returnDocument: "after" });
  // Same response for missing, verified and rate-limited addresses.
  if (!user) return;
  try { await sendVerificationEmail({ to: email, code: challenge.code }); }
  catch { fail(503, "The verification email could not be sent. Please try again shortly."); }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
  if (!user || !(await argon2.verify(user.passwordHash, password))) fail(401, "Incorrect email or password.");
  if (!user.emailVerified) fail(403, "Please verify your email before logging in.");
  if (user.accountStatus === "SUSPENDED") fail(403, "This account has been suspended.");
  return user;
}
