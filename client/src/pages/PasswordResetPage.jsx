import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import ContentForm from "../components/ContentForm.jsx";
import { api } from "../lib/apiClient.js";
export default function PasswordResetPage() {
  const [params] = useSearchParams(), token = params.get("token"), [message, setMessage] = useState("");
  return <main className="auth-card"><h1>{token ? "Choose a new password" : "Reset your password"}</h1>{message ? <p role="status">{message}</p> :
    <ContentForm fields={token ? [{ name: "password", label: "New password", type: "password" }, { name: "confirmPassword", label: "Confirm password", type: "password" }] : [{ name: "email", label: "College email", type: "email" }]} label={token ? "Reset password" : "Send reset instructions"} onSubmit={async data => {
      if (token && data.password !== data.confirmPassword) throw new Error("Passwords do not match.");
      const result = await api(token ? "/auth/reset-password" : "/auth/forgot-password", { method: "post", data: token ? { token, password: data.password } : data });
      setMessage(result.message);
    }} />}<Link to="/login">Back to login</Link></main>;
}
