import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const VERIFICATION_CODE_EXPIRY_MS =
  10 * 60 * 1000;

export const VERIFICATION_RESEND_COOLDOWN_MS =
  30 * 1000;

export const MAX_VERIFICATION_ATTEMPTS = 5;

function getOtpPepper() {
  const pepper = process.env.OTP_PEPPER;

  if (!pepper) {
    throw new Error(
      "OTP_PEPPER is not configured."
    );
  }

  return pepper;
}

export function generateVerificationCode() {
  return String(
    randomInt(100000, 1000000)
  );
}

export function hashVerificationCode(code) {
  return createHmac(
    "sha256",
    getOtpPepper()
  )
    .update(code)
    .digest("hex");
}

export function createVerificationChallenge() {
  const code = generateVerificationCode();

  const codeHash =
    hashVerificationCode(code);

  const expiresAt = new Date(
    Date.now() +
      VERIFICATION_CODE_EXPIRY_MS
  );

  return {
    code,
    codeHash,
    expiresAt,
  };
}

export function verificationCodeMatches(
  code,
  storedHash
) {
  const suppliedHash =
    hashVerificationCode(code);

  const suppliedBuffer = Buffer.from(
    suppliedHash,
    "hex"
  );

  const storedBuffer = Buffer.from(
    storedHash,
    "hex"
  );

  if (
    suppliedBuffer.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    suppliedBuffer,
    storedBuffer
  );
}
