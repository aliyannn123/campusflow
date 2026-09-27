import { z } from "zod";
export function validateEnvironment() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  for (const key of ["SESSION_SECRET", "OTP_PEPPER"]) if (!process.env[key] || process.env[key].length < 32) throw new Error(key + " must contain at least 32 characters.");
  if (process.env.NODE_ENV !== "production") return;
  process.env.CLIENT_ORIGIN ||= process.env.RENDER_EXTERNAL_URL;
  if (!process.env.CLIENT_ORIGIN?.startsWith("https://")) throw new Error("Production CLIENT_ORIGIN must be an HTTPS origin.");
  if (new URL(process.env.CLIENT_ORIGIN).origin !== process.env.CLIENT_ORIGIN) throw new Error("CLIENT_ORIGIN must not include a path or trailing slash.");
  if (!process.env.EMAIL_FROM || !["smtp", "resend", "brevo"].includes(process.env.EMAIL_MODE)) throw new Error("Production requires SMTP or HTTPS email configuration.");
  if (process.env.EMAIL_MODE === "brevo") {
    if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is required.");
    if (!z.email().safeParse(process.env.EMAIL_FROM).success) throw new Error("For Brevo, EMAIL_FROM must be the verified sender's plain email address.");
  }
  if (process.env.EMAIL_MODE === "smtp" && !process.env.SMTP_HOST) throw new Error("SMTP_HOST is required.");
  if (process.env.EMAIL_MODE === "resend" && !process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required.");
  if (process.env.STORAGE_PROVIDER !== "s3") throw new Error("Production requires durable S3-compatible storage.");
  for (const key of ["S3_BUCKET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) if (!process.env[key]) throw new Error(key + " is required.");
}
