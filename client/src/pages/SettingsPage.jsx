import { Link } from "react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useAuth } from "../features/auth/useAuth.js";
import ContentForm from "../components/ContentForm.jsx";
export default function SettingsPage({ profileOnly = false }) {
  const { user, refresh, logout } = useAuth(), queries = useQueryClient(), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("campusflow-theme") || "light");
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api("/settings") });
  async function change(spaceId, notificationPreference) { try { await api("/settings/" + spaceId, { method: "put", data: { notificationPreference } }); await queries.invalidateQueries({ queryKey: ["settings"] }); } catch (err) { setError(err.message); } }
  return <><header className="page-header"><h1>{profileOnly ? "Profile" : "Settings"}</h1><p>Make CampusFlow work for you.</p></header>
    {profileOnly ? <section className="card"><h2>{user.name}</h2><p>{user.email}</p><span className="badge">{user.accountType}</span>
      <ContentForm key={JSON.stringify(user.profile)} initial={{ name: user.name, ...user.profile, skills: user.profile?.skills?.join(", "), interests: user.profile?.interests?.join(", ") }} fields={[{ name: "name", label: "Name" }, { name: "bio", label: "Bio", type: "textarea", max: 300, optional: true }, { name: "linkedInUrl", label: "LinkedIn URL", type: "url", optional: true }, { name: "githubUrl", label: "GitHub URL", type: "url", optional: true }, { name: "skills", label: "Skills (comma separated)", optional: true }, { name: "interests", label: "Interests (comma separated)", optional: true }]} label="Save profile" onSubmit={async data => { for (const key of ["skills", "interests"]) data[key] = data[key].split(",").map(s => s.trim()).filter(Boolean); await api("/users/me/profile", { method: "put", data }); await refresh(); setSaved(true); }} />
      {saved && <p role="status">Profile saved.</p>}
      <p>Ask an administrator to update your academic record.</p>
    </section> : <><Link className="card" to="/profile">Edit your profile →</Link>
    <section className="card"><label>Appearance<select value={theme} onChange={e => { setTheme(e.target.value); localStorage.setItem("campusflow-theme", e.target.value); document.documentElement.dataset.theme = e.target.value; }}><option value="light">Light</option><option value="dark">Dark</option></select></label><button className="secondary" onClick={() => logout().catch(err => setError(err.message))}>Log out</button></section>
    <h2>Space notifications</h2>{(error || query.error) && <p role="alert">{error || query.error.message}</p>}<div className="stack">{query.data?.data.map(membership => <label className="card" key={membership._id}>{membership.spaceId.name}<select value={membership.notificationPreference || "ALL"} onChange={event => change(membership.spaceId._id, event.target.value)}><option value="ALL">All updates</option><option value="IMPORTANT_ONLY">Important updates only</option><option value="MUTED">Muted</option></select></label>)}</div></>}</>;
}
