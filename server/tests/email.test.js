import { afterEach, expect, test, vi } from "vitest";
import { sendEmail } from "../src/services/email.service.js";
import { validateEnvironment } from "../src/config/environment.js";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test("HTTPS email delivery uses the configured sender and never exposes a provider error", async () => {
  vi.stubEnv("EMAIL_MODE", "resend"); vi.stubEnv("EMAIL_FROM", "CampusFlow <noreply@example.com>"); vi.stubEnv("RESEND_API_KEY", "test-only-key");
  const fetch = vi.fn(async () => ({ ok: true })); vi.stubGlobal("fetch", fetch);
  await sendEmail({ to: "student@college.ac.in", subject: "Verify", text: "123456" });
  expect(fetch.mock.calls[0][0]).toBe("https://api.resend.com/emails");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ from: "CampusFlow <noreply@example.com>", to: ["student@college.ac.in"], subject: "Verify", text: "123456" });
  fetch.mockResolvedValue({ ok: false, status: 403 });
  await expect(sendEmail({ to: "student@college.ac.in", subject: "Verify", text: "123456" })).rejects.toThrow("Email provider rejected delivery (403).");
});
test("production refuses console email and accepts complete HTTPS delivery configuration", () => {
  for (const [key, value] of Object.entries({ NODE_ENV: "production", MONGODB_URI: "mongodb://localhost/test", SESSION_SECRET: "a".repeat(32), OTP_PEPPER: "b".repeat(32), CLIENT_ORIGIN: "https://example.onrender.com", EMAIL_MODE: "console", EMAIL_FROM: "noreply@example.com", STORAGE_PROVIDER: "s3", S3_ENDPOINT: "https://storage.example.com", S3_BUCKET: "test", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test" })) vi.stubEnv(key, value);
  expect(validateEnvironment).toThrow("Production requires SMTP or HTTPS email configuration.");
  vi.stubEnv("EMAIL_MODE", "resend"); vi.stubEnv("RESEND_API_KEY", "test");
  expect(validateEnvironment).not.toThrow();
});
