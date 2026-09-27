import { useState } from "react";
import { NavLink, useParams } from "react-router";
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
  const [editing, setEditing] = useState(null), [error, setError] = useState("");
  const collegeAdmin = user.globalRoles.includes("COLLEGE_ADMIN");
  const allowedTabs = collegeAdmin ? tabs : ["placements"];
  const allowed = collegeAdmin || user.globalRoles.includes("PLACEMENT_COORDINATOR");
  const query = useQuery({ queryKey: ["admin", section], queryFn: () => api("/admin/" + section), enabled: allowed && allowedTabs.includes(section) });
  const lookup = useQuery({ queryKey: ["admin", "lookups"], queryFn: async () => {
    const keys = collegeAdmin ? ["departments", "programs", "sections", "subjects", "clubs", "users"] : ["departments"];
    const responses = await Promise.all(keys.map(key => api("/admin/" + key)));
    const result = Object.fromEntries(keys.map((key, index) => [key, responses[index].data]));
    result.faculty = (result.users || []).filter(u => u.accountType === "FACULTY" && u.accountStatus === "ACTIVE");
    return result;
  }, enabled: allowed });
  async function action(path, data, method = "put") {
    await api("/admin/" + path, { method, data });
    await queries.invalidateQueries({ queryKey: ["admin"] }); queries.invalidateQueries({ queryKey: ["spaces"] });
  }
  async function click(path, data) { setError(""); try { await action(path, data); } catch (err) { setError(err.message); } }
  if (!allowed) return <p role="alert">Administrator access is required.</p>;
  const fields = recordFields(section, lookup.data || {});
  function initial(record) {
    const values = { ...record };
    const audience = record.audience || record.eligibility || {};
    Object.assign(values, audience);
    if (audience.graduationYears) values.graduationYears = audience.graduationYears.join(", ");
    for (const key of ["startAt", "endAt", "expiresAt", "deadlineAt"]) if (values[key]) { const d = new Date(values[key]); values[key] = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    return values;
  }
  return <><header className="page-header"><p className="eyebrow">COLLEGE ADMINISTRATION</p><h1>{section[0].toUpperCase() + section.slice(1)}</h1></header>
    <nav className="tabs">{allowedTabs.map(tab => <NavLink key={tab} to={"/admin/" + tab} onClick={() => { setEditing(null); setError(""); }}>{tab}</NavLink>)}</nav>
    {(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.isPending && <p role="status">Loading…</p>}
    {section === "overview" && <div className="card-grid">{Object.entries(query.data?.data || {}).map(([label, count]) => <div className="card" key={label}><p>{label.replace(/([A-Z])/g, " $1")}</p><h1>{count}</h1></div>)}</div>}
    {section === "users" && <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Account</th><th>Status</th><th>Actions</th></tr></thead><tbody>{query.data?.data.map(person => <tr key={person.id}><td>{person.name}</td><td>{person.email}</td><td>{person.accountType}</td><td>{person.accountStatus}</td><td>{person.id !== user.id && person.emailVerified && <button className="secondary" onClick={() => click("users/" + person.id + "/status", { accountStatus: person.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>{person.accountStatus === "ACTIVE" ? "Suspend" : "Approve / activate"}</button>}<UserEditor person={person} lookup={lookup.data || {}} action={action} self={person.id === user.id} /></td></tr>)}</tbody></table></div>}
    {Array.isArray(query.data?.data) && section !== "users" && <div className="stack">{query.data.data.map(record => <article className="card" key={record._id}><div className="row"><h3>{record.name || record.title || record.companyName || record.action || record.reason || record.academicYear}</h3>{record.status && <span className="badge">{record.status}</span>}</div><p>{record.description || record.summary || record.details || record.body || record.code}</p>{section === "audit" && <p>{record.actorUserId?.name} · {new Date(record.createdAt).toLocaleString()}</p>}
      {fields.length > 0 && <button className="secondary" onClick={() => setEditing(record)}>Edit</button>}
      {["events", "notices", "placements", "clubs", "sections"].includes(section) && <AdminDetails section={section} record={record} action={action} users={lookup.data?.users || []} />}
      {section === "moderation" && record.status === "OPEN" && <ContentForm fields={[options("resolutionAction", "Resolution", ["DISMISSED", "CONTENT_REMOVED", "USER_SUSPENDED", "CONTENT_REMOVED_AND_USER_SUSPENDED"]), { name: "resolutionNote", label: "Reason for decision", type: "textarea" }]} label="Resolve report" onSubmit={data => action("moderation/" + record._id, data)} />}
    </article>)}</div>}
    {section === "organization" && query.data?.data?._id && <section className="card"><h2>College logo</h2><p>Upload a PNG, JPEG or WebP image.</p><UploadForm path={"/files/ORGANIZATION/" + query.data.data._id} onDone={() => queries.invalidateQueries({ queryKey: ["organization"] })} /></section>}
    {fields.length > 0 && <section className="card"><h2>{section === "organization" ? "College settings" : editing ? "Edit record" : "Create " + section.replace(/s$/, "")}</h2>{editing && <button className="secondary" onClick={() => setEditing(null)}>Cancel editing</button>}
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
        setEditing(null);
      }} />
    </section>}
  </>;
}
function AdminDetails({ section, record, action, users }) {
  const [open, setOpen] = useState(false);
  const suffix = { events: "registrations", notices: "acknowledgements", placements: "tracking", clubs: "members", sections: "members" }[section];
  const query = useQuery({ queryKey: ["admin", section, record._id, suffix], queryFn: () => api("/admin/" + section + "/" + record._id + "/" + suffix), enabled: open });
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>View {suffix}</summary>{query.error && <p role="alert">{query.error.message}</p>}{query.data?.data.map(item => <p key={item._id}>{item.userId?.name} · {item.status || "Acknowledged"} {item.roles?.join(", ")}</p>)}
    {section === "sections" && <ContentForm fields={[{ name: "userId", label: "User", options: users.filter(u => u.accountStatus === "ACTIVE").map(u => [u.id, u.name]) }, options("role", "Class role", ["STUDENT", "CR", "CLASS_COORDINATOR"])]} label="Save class role" onSubmit={data => action("sections/" + record._id + "/members/" + data.userId, { role: data.role })} />}
    {section === "clubs" && <ContentForm fields={[{ name: "userId", label: "User", options: users.filter(u => u.accountStatus === "ACTIVE").map(u => [u.id, u.name]) }, options("role", "Role", ["MEMBER", "CORE_TEAM", "CLUB_LEAD"]), options("status", "Membership", ["ACTIVE", "INACTIVE"])]} label="Save membership" onSubmit={data => action("clubs/" + record._id + "/members/" + data.userId, { status: data.status, roles: [data.role] })} />}
  </details>;
}
