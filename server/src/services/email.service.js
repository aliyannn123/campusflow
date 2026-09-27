import nodemailer from "nodemailer";
let transporter;
export async function sendEmail({ to, subject, text }) {
  const mode = process.env.EMAIL_MODE || "console";
  if (mode === "console" && process.env.NODE_ENV !== "production") {
    console.log("[Development email] To: " + to + "\n" + subject + "\n" + text);
    return;
  }
  if (mode === "resend") {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error("HTTPS email delivery is not configured.");
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json", "User-Agent": "CampusFlow/1.0" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Email provider rejected delivery (" + response.status + ").");
    return;
  }
  if (mode !== "smtp" || !process.env.SMTP_HOST || !process.env.EMAIL_FROM) throw new Error("SMTP email delivery is not configured.");
  transporter ||= nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", connectionTimeout: 15000, socketTimeout: 20000, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}
export function sendVerificationEmail({ to, code }) {
  return sendEmail({ to, subject: "Verify your CampusFlow email", text: "Your CampusFlow verification code is " + code + ". It expires in 10 minutes. If you did not request this, ignore this email." });
}
