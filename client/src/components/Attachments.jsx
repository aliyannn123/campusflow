import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "../lib/apiClient.js";
export function UploadForm({ path, resource = false, onDone }) {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    try { await api(path, { method: "post", data: new FormData(form) }); form.reset(); await onDone?.(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}>{resource && <label>Resource title<input name="title" required minLength={3} maxLength={180} /></label>}<label>Attach file (up to 10 MB)<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" required /></label>{error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? "Uploading…" : "Upload"}</button></form>;
}
export default function Attachments({ type, targetId, canUpload = false }) {
  const queries = useQueryClient(), [error, setError] = useState("");
  const key = ["attachments", type, targetId];
  const query = useQuery({ queryKey: key, queryFn: () => api("/files/for/" + type + "/" + targetId) });
  async function download(file) {
    try { const response = await apiClient.get("/files/" + file._id, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.originalName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { setError(err.message); }
  }
  return <>{error && <p role="alert">{error}</p>}{query.data?.data.map(file => <button className="secondary" key={file._id} onClick={() => download(file)}>Download {file.originalName}</button>)}{canUpload && <details><summary>Add attachment</summary><UploadForm path={"/files/" + type + "/" + targetId} onDone={() => queries.invalidateQueries({ queryKey: key })} /></details>}</>;
}
