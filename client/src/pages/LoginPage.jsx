import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../lib/apiClient.js";
import { useAuth, landingPath } from "../features/auth/useAuth.js";
export default function LoginPage() {
  const { acceptSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("/auth/login", { method: "post", data: Object.fromEntries(new FormData(event.currentTarget)) });
      acceptSession(result); navigate(landingPath(result.data.user), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-card"><Link className="brand" to="/login">CampusFlow</Link><h1>Welcome back</h1><p>Your campus, connected.</p>
    <form onSubmit={submit}>
      <label>College email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Signing in…" : "Log in"}</button>
    </form>
    <p>New here? <Link to="/register">Create an account</Link></p>
    <p><Link to="/verify-email">Verify your email</Link></p>
    <p><Link to="/forgot-password">Forgot your password?</Link></p>
  </main>;
}
