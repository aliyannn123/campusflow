import { useState } from "react";
import ContentForm from "./ContentForm.jsx";
import { api } from "../lib/apiClient.js";
export default function ReportButton({ targetType, targetId }) {
  const [sent, setSent] = useState(false);
  if (sent) return <p role="status">Report submitted for review.</p>;
  return <details><summary>Report content</summary><ContentForm fields={[{ name: "reason", label: "Reason", options: ["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "PRIVACY", "OTHER"].map(v => [v, v.toLowerCase()]) }, { name: "details", label: "Details", type: "textarea", optional: true, max: 1000 }]} label="Submit report" onSubmit={async data => { await api("/reports", { method: "post", data: { ...data, targetType, targetId } }); setSent(true); }} /></details>;
}
