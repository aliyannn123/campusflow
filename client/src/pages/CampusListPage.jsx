import Attachments from "../components/Attachments.jsx";
import ReportButton from "../components/ReportButton.jsx";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useAuth } from "../features/auth/useAuth.js";
import ContentForm from "../components/ContentForm.jsx";
const titles = { events: "Events", notices: "Notices", placements: "Placements", "lost-found": "Lost & Found" };
export default function CampusListPage() {
  const { category } = useParams(), { user } = useAuth(), queries = useQueryClient();
  const [error, setError] = useState(""), [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["campus", category], queryFn: () => api("/campus/" + category), enabled: !!titles[category] });
  async function action(path, method, data = {}) {
    await api("/campus/" + category + path, { method, data });
    await queries.invalidateQueries({ queryKey: ["campus", category] });
    queries.invalidateQueries({ queryKey: ["calendar"] });
  }
  async function click(path, method, data) { setError(""); try { await action(path, method, data); } catch (err) { setError(err.message); } }
  if (!titles[category]) return <p>Page not found.</p>;
  return <><header className="page-header"><Link to="/campus">← Campus</Link><h1>{titles[category]}</h1></header>
    <label>Search {titles[category].toLowerCase()}<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or description" /></label>
    {(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.isPending && <p role="status">Loading…</p>}
    <div className="stack">{query.data?.data.filter(r => [r.title, r.description, r.body, r.companyName, r.roleTitle].join(" ").toLowerCase().includes(search.toLowerCase())).map(record => <article className="card" key={record._id}>
      <div className="row"><span className="badge">{record.category || record.opportunityType || record.type}</span>{record.priority && <span className="badge">{record.priority}</span>}</div>
      <h2>{record.title || record.companyName + " · " + record.roleTitle}</h2><p className="content-text">{record.description || record.body}</p>
      {category === "events" && <><p>{new Date(record.startAt).toLocaleString()} — {new Date(record.endAt).toLocaleString()}</p><p>{record.location} · {record.registeredCount}{record.capacity ? "/" + record.capacity : ""} registered</p>
        {record.registrationRequired && <button disabled={!record.eligible || (!record.registered && record.capacity && record.registeredCount >= record.capacity)} onClick={() => click("/" + record._id + "/registration", record.registered ? "delete" : "put")}>{record.registered ? "Cancel registration" : record.eligible ? "Register" : "Not eligible"}</button>}</>}
      {category === "notices" && record.acknowledgementRequired && <button disabled={record.acknowledged} onClick={() => click("/" + record._id + "/acknowledgement", "put")}>{record.acknowledged ? "Acknowledged" : "I have read this notice"}</button>}
      {category === "placements" && <><p>{record.location} · {record.workMode} · {record.compensation}</p><p>Apply by {new Date(record.deadlineAt).toLocaleString()}</p><span className="badge">{record.eligibilityStatus === "UNKNOWN" ? "Complete your profile to confirm eligibility" : record.eligibilityStatus}</span>
        {record.eligibilityStatus === "ELIGIBLE" && <div className="row"><a href={record.applicationUrl} target="_blank" rel="noreferrer">Apply on company website ↗</a><button className="secondary" onClick={() => click("/" + record._id + "/applied", record.applied ? "delete" : "put")}>{record.applied ? "Undo applied" : "Mark as applied"}</button></div>}</>}
      {category === "lost-found" && <><p>{record.type} · {record.locationText} · {new Date(record.occurredAt).toLocaleDateString()}</p><p>{record.handoverNote}</p><span className="badge">{record.status}</span><p>Posted by {record.postedById?.name}</p><Attachments type="LOST_FOUND_ITEM" targetId={record._id} canUpload={record.postedById?._id === user.id} /><ReportButton targetType="LOST_FOUND_ITEM" targetId={record._id} />
        {record.postedById?._id === user.id && <div className="row">{record.status === "OPEN" && <button onClick={() => click("/" + record._id + "/resolve", "put", { resolutionNote: "Resolved by owner" })}>Mark resolved</button>}<button className="secondary" onClick={() => click("/" + record._id, "delete")}>Remove listing</button></div>}</>}
    </article>)}</div>
    {query.isSuccess && !query.data.data.length && <div className="empty-state">No {titles[category].toLowerCase()} to show yet.</div>}
    {category === "lost-found" && <details className="card"><summary>Report a lost or found item</summary><ContentForm fields={[
      { name: "type", label: "I have", options: [["LOST", "Lost something"], ["FOUND", "Found something"]] }, { name: "title", label: "Item" }, { name: "description", label: "Description", type: "textarea", max: 3000 },
      { name: "category", label: "Category", options: ["ID_CARD", "ELECTRONICS", "KEYS", "BOOKS", "BAG", "ACCESSORIES", "CLOTHING", "OTHER"].map(v => [v, v.replaceAll("_", " ")]) },
      { name: "locationText", label: "Last seen / found at", optional: true }, { name: "occurredAt", label: "When", type: "datetime-local" }, { name: "handoverNote", label: "How to arrange a handover", optional: true },
    ]} onSubmit={data => action("", "post", { ...data, occurredAt: new Date(data.occurredAt).toISOString() })} label="Post listing" /></details>}
  </>;
}
