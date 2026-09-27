import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "../lib/apiClient.js";
import { useAuth, landingPath } from "../features/auth/useAuth.js";
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { acceptSession } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api("/auth/verify-email", { method: "post", data: { email, code } });
      acceptSession(result); navigate(landingPath(result.data.user), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError("");
    try { const result = await api("/auth/resend-verification", { method: "post", data: { email } }); setMessage(result.message); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-card"><h1>Verify your email</h1><p>Enter the six-digit code sent to your college email.</p>
    <form onSubmit={submit}>
      <label>College email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} required /></label>
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
      <button disabled={busy}>{busy ? "Please wait…" : "Verify email"}</button>
      <button type="button" className="secondary" disabled={busy || !email} onClick={resend}>Resend code</button>
    </form><Link to="/login">Back to login</Link>
  </main>;
}
