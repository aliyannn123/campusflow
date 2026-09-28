import Modal from "../components/Modal.jsx";
import { useConfirmation } from "../components/useConfirmation.jsx";
import { useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../features/auth/useAuth.js";
import { api } from "../lib/apiClient.js";
import ContentForm from "../components/ContentForm.jsx";
import { UploadForm } from "../components/Attachments.jsx";
import UserEditor from "../features/admin/UserEditor.jsx";
import { options, recordFields } from "../features/admin/fields.js";
const tabs = ["overview", "users", "departments", "programs", "sections", "subjects", "offerings", "clubs", "notices", "events", "placements", "moderation", "organization", "audit"];
export default function AdminPage() {
  const { section = "overview" } = useParams(), { user } = useAuth(), queries = useQueryClient();
  const [editing, setEditing] = useState(null), [creating, setCreating] = useState(false), [error, setError] = useState("");
  const { confirm, dialog } = useConfirmation();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1, q = params.get("q") || "", status = params.get("status") || "", role = params.get("role") || "";
  const collegeAdmin = user.globalRoles.includes("COLLEGE_ADMIN");
  const allowedTabs = collegeAdmin ? tabs : ["placements"];
  const allowed = collegeAdmin || user.globalRoles.includes("PLACEMENT_COORDINATOR");
  const query = useQuery({ queryKey: ["admin", section, page, q, status, role], queryFn: () => api("/admin/" + section + "?" + new URLSearchParams({ page, q, status, role, limit: 25 })), enabled: allowed && allowedTabs.includes(section) });
  async function action(path, data, method = "put") {
    const consequential = /\/(status|roles|members|academic-profile)(\/|$)/.test(path) || path.startsWith("moderation/") || ["CLOSED", "CANCELLED", "REMOVED", "INACTIVE"].includes(data.status);
    if (consequential && !await confirm("Confirm administrative change", "Apply this change to " + (data.name || data.title || data.companyName || path.split("/")[0]) + "? " + (data.accountStatus === "SUSPENDED" || String(data.resolutionAction).includes("SUSPENDED") ? "The affected user will lose access and be signed out." : "This may change access, membership or content availability. Review the selected record before confirming."))) throw new Error("Change cancelled. Nothing was saved.");
    await api("/admin/" + path, { method, data });
    await queries.invalidateQueries({ queryKey: ["admin"] }); for (const key of ["spaces", "calendar", "campus", "dashboard", "clubs", "organization"]) queries.invalidateQueries({ queryKey: [key] });
  }
  async function click(path, data) { setError(""); try { await action(path, data); } catch (err) { setError(err.message); } }
  if (!allowed) return <p role="alert">Administrator access is required.</p>;
  const fields = recordFields(section);
  const statuses = section === "users" ? ["ACTIVE", "PENDING_APPROVAL", "PENDING_EMAIL_VERIFICATION", "SUSPENDED"] : section === "moderation" ? ["OPEN", "RESOLVED"] : section === "notices" ? ["ACTIVE", "EXPIRED", "CLOSED", "REMOVED"] : section === "events" ? ["ACTIVE", "COMPLETED", "CANCELLED"] : section === "placements" ? ["ACTIVE", "CLOSED"] : ["ACTIVE", "INACTIVE"];
  function initial(record) {
    const values = { ...record };
    const audience = record.audience || record.eligibility || {};
    Object.assign(values, audience);
    if (audience.graduationYears) values.graduationYears = audience.graduationYears.join(", ");
    for (const key of ["startAt", "endAt", "expiresAt", "deadlineAt"]) if (values[key]) { const d = new Date(values[key]); values[key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    return values;
  }
  return <>{dialog}<header className="page-header"><p className="eyebrow">COLLEGE ADMINISTRATION</p><h1>{section[0].toUpperCase() + section.slice(1)}</h1></header>
    <nav className="tabs">{allowedTabs.map(tab => <NavLink key={tab} to={"/admin/" + tab} onClick={() => { setEditing(null); setCreating(false); setError(""); }}>{tab}</NavLink>)}</nav>
    {!["overview", "organization"].includes(section) && <form className="filter-bar" key={section} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setParams({ q: f.get("q"), status: f.get("status"), role: f.get("role") || "", page: 1 }); }}><label>Search records<input name="q" type="search" defaultValue={q} /></label><label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>{section === "users" && <label>Role<select name="role" defaultValue={role}><option value="">All roles</option>{["STUDENT", "FACULTY", "COLLEGE_ADMIN", "DEPARTMENT_ADMIN", "PLACEMENT_COORDINATOR"].map(r => <option key={r}>{r}</option>)}</select></label>}<button>Filter</button></form>}
    {fields.length > 0 && <button onClick={() => { setEditing(null); setCreating(true); }}>{section === "organization" ? "Edit college settings" : "Create " + section.replace(/s$/, "")}</button>}
    {query.data?.pagination && <div className="toolbar"><span>{query.data.pagination.total} records · Page {page} of {query.data.pagination.pages}</span><div className="row"><button className="secondary" disabled={page <= 1} onClick={() => setParams({ q, status, role, page: page - 1 })}>Previous</button><button className="secondary" disabled={page >= query.data.pagination.pages} onClick={() => setParams({ q, status, role, page: page + 1 })}>Next</button></div></div>}
    {(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.isPending && <p role="status">Loading…</p>}
    {section === "overview" && <div className="card-grid">{Object.entries(query.data?.data || {}).map(([label, count]) => <div className="card" key={label}><p>{label.replace(/([A-Z])/g, " $1")}</p><h1>{count}</h1></div>)}</div>}
    {section === "users" && <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Account</th><th>Status</th><th>Actions</th></tr></thead><tbody>{query.data?.data.map(person => <tr key={person.id}><td>{person.name}</td><td>{person.email}</td><td>{person.accountType}</td><td>{person.accountStatus}</td><td>{person.id !== user.id && person.emailVerified && <button className="secondary" onClick={() => click("users/" + person.id + "/status", { name: person.name, accountStatus: person.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>{person.accountStatus === "ACTIVE" ? "Suspend" : "Approve / activate"}</button>}<UserEditor person={person} action={action} self={person.id === user.id} /></td></tr>)}</tbody></table></div>}
    {Array.isArray(query.data?.data) && section !== "users" && <div className="stack">{query.data.data.map(record => <article className="card" key={record._id}><div className="row"><h3>{record.name || record.title || record.companyName || record.action || record.reason || record.academicYear}</h3>{record.status && <span className="badge">{record.status}</span>}</div><p>{record.description || record.summary || record.details || record.body || record.code}</p>{section === "audit" && <p>{record.actorUserId?.name} · {new Date(record.createdAt).toLocaleString()}</p>}
      {fields.length > 0 && <button className="secondary" onClick={() => setEditing(record)}>Edit</button>}
      {["events", "notices", "placements", "clubs", "sections"].includes(section) && <AdminDetails section={section} record={record} action={action}  />}
      {section === "moderation" && record.status === "OPEN" && <ContentForm fields={[options("resolutionAction", "Resolution", ["DISMISSED", "CONTENT_REMOVED", "USER_SUSPENDED", "CONTENT_REMOVED_AND_USER_SUSPENDED"]), { name: "resolutionNote", label: "Reason for decision", type: "textarea" }]} label="Resolve report" onSubmit={data => action("moderation/" + record._id, data)} />}
    </article>)}</div>}
    {section === "organization" && query.data?.data?._id && <section className="card"><h2>College logo</h2><p>Upload a PNG, JPEG or WebP image.</p><UploadForm path={"/files/ORGANIZATION/" + query.data.data._id} onDone={() => queries.invalidateQueries({ queryKey: ["organization"] })} /></section>}
    {fields.length > 0 && (creating || editing) && <Modal title={section === "organization" ? "College settings" : editing ? "Edit record" : "Create record"} onClose={() => { setEditing(null); setCreating(false); }}><section className="card"><h2>{section === "organization" ? "College settings" : editing ? "Edit record" : "Create " + section.replace(/s$/, "")}</h2>{editing && <button className="secondary" onClick={() => setEditing(null)}>Cancel editing</button>}
      <ContentForm key={section + (editing?._id || query.data?.data?._id || "new")} fields={fields} initial={initial(editing || (section === "organization" ? query.data?.data : {}) || {})} label="Save" onSubmit={async data => {
        for (const key of ["startAt", "endAt", "deadlineAt", "expiresAt"]) if (key in data) data[key] = data[key] ? new Date(data[key]).toISOString() : null;
        for (const key of ["primaryFacultyId", "clubId", "capacity"]) if (key in data && !data[key]) data[key] = null;
        const values = { ...(editing || {}), ...data };
        if (["notices", "events", "placements"].includes(section)) {
          const target = { departmentIds: data.departmentIds || [], years: (data.years || []).map(Number) };
          if (section === "notices") target.accountTypes = data.accountTypes || [];
          if (section === "placements") { target.graduationYears = (data.graduationYears || "").split(",").map(v => v.trim()).filter(Boolean).map(Number); target.minCGPA = data.minCGPA === "" ? null : Number(data.minCGPA); target.maxActiveBacklogs = data.maxActiveBacklogs === "" ? null : Number(data.maxActiveBacklogs); }
          values[section === "notices" ? "audience" : "eligibility"] = target;
        }
        await action(section + (editing ? "/" + editing._id : ""), values, section === "organization" || editing ? "put" : "post");
        setEditing(null); setCreating(false);
      }} />
    </section></Modal>}
  </>;
}
function AdminDetails({ section, record, action }) {
  const [open, setOpen] = useState(false);
  const suffix = { events: "registrations", notices: "acknowledgements", placements: "tracking", clubs: "members", sections: "members" }[section];
  const query = useQuery({ queryKey: ["admin", section, record._id, suffix], queryFn: () => api("/admin/" + section + "/" + record._id + "/" + suffix), enabled: open });
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>View {suffix}</summary>{query.error && <p role="alert">{query.error.message}</p>}{query.data?.statistics && <div className="row"><span>Targeted: {query.data.statistics.targeted ?? "Not recorded"}</span><span>Acknowledged: {query.data.statistics.acknowledged}</span><span>Pending: {query.data.statistics.pending ?? "Unknown"}</span><span>Rate: {query.data.statistics.rate == null ? "Unavailable for older records" : query.data.statistics.rate + "%"}</span></div>}{query.data?.data.map(item => <p key={item._id}>{item.userId?.name} · {item.status || "Acknowledged"} {item.roles?.join(", ")}</p>)}
    {section === "sections" && <ContentForm fields={[{ name: "userId", label: "User", remote: "/admin/users?status=ACTIVE" }, options("role", "Class role", ["STUDENT", "CR", "CLASS_COORDINATOR"])]} label="Save class role" onSubmit={data => action("sections/" + record._id + "/members/" + data.userId, { role: data.role })} />}
    {section === "clubs" && <ContentForm fields={[{ name: "userId", label: "User", remote: "/admin/users?status=ACTIVE" }, options("role", "Role", ["MEMBER", "CORE_TEAM", "CLUB_LEAD"]), options("status", "Membership", ["ACTIVE", "INACTIVE"])]} label="Save membership" onSubmit={data => action("clubs/" + record._id + "/members/" + data.userId, { status: data.status, roles: [data.role] })} />}
  </details>;
}
