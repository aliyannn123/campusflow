import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/apiClient.js";
import ContentForm from "../../components/ContentForm.jsx";
import Modal from "../../components/Modal.jsx";
import { useConfirmation } from "../../components/useConfirmation.jsx";
const localDate = value => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function ClubEvents({ spaceId, canManage }) {
  const queries = useQueryClient(), [editing, setEditing] = useState(null), [open, setOpen] = useState(false), [error, setError] = useState("");
  const { confirm, dialog } = useConfirmation(), path = "/spaces/" + spaceId + "/events";
  const query = useQuery({ queryKey: ["space", spaceId, "events"], queryFn: () => api(path) });
  const departments = useQuery({ queryKey: ["academic", "departments"], queryFn: () => api("/academic/departments"), enabled: canManage });
  async function save(data, record = editing) {
    await api(path + (record ? "/" + record._id : ""), { method: record ? "put" : "post", data });
    for (const key of [["space", spaceId], ["campus"], ["calendar"], ["dashboard"]]) queries.invalidateQueries({ queryKey: key });
  }
  async function cancel(record) {
    if (!await confirm("Cancel " + record.title + "?", "Registered members will be notified. Registration history will be preserved.")) return;
    try { await save({ ...record, status: "CANCELLED" }, record); } catch (err) { setError(err.message); }
  }
  return <>{dialog}<div className="toolbar"><h2>Club events</h2>{canManage && <button onClick={() => { setEditing(null); setOpen(true); }}>Create club event</button>}</div>
    {(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.isPending && <p role="status">Loading events…</p>}
    {query.data?.data.length === 0 && <p className="empty-state">No club events yet.</p>}
    {query.data?.data.map(record => <article className="card" key={record._id}><span className="badge">{record.status === "CANCELLED" ? "Cancelled" : new Date(record.endAt) < new Date() ? "Completed" : "Upcoming"}</span><h3>{record.title}</h3><p>{new Date(record.startAt).toLocaleString()} · {record.location}</p><Link to={"/campus/events/" + record._id}>View event and registration</Link>{canManage && <><div className="row">{record.status !== "CANCELLED" && <><button className="secondary" onClick={() => { setEditing(record); setOpen(true); }}>Edit event</button><button className="secondary" onClick={() => cancel(record)}>Cancel event</button></>}</div><Registrations path={path + "/" + record._id + "/registrations"} spaceId={spaceId} /></>}</article>)}
    {open && <Modal title={editing ? "Edit club event" : "Create club event"} onClose={() => setOpen(false)}><ContentForm label="Save event" initial={editing ? { ...editing, ...editing.eligibility, years: editing.eligibility?.years?.map(String), startAt: localDate(editing.startAt), endAt: localDate(editing.endAt), capacity: editing.capacity ?? "" } : { registrationRequired: true }} fields={[
      { name: "title", label: "Title" }, { name: "description", label: "Description", type: "textarea" }, { name: "startAt", label: "Starts", type: "datetime-local" }, { name: "endAt", label: "Ends", type: "datetime-local" }, { name: "location", label: "Location" }, { name: "registrationRequired", label: "Require registration", type: "checkbox", optional: true }, { name: "capacity", label: "Capacity (blank for unlimited)", type: "number", min: 1, optional: true },
      { name: "departmentIds", label: "Departments (none means all)", multiple: true, optional: true, options: (departments.data?.data || []).map(d => [d._id, d.name]) }, { name: "years", label: "Years (none means all)", multiple: true, optional: true, options: Array.from({ length: 8 }, (_, i) => [String(i + 1), "Year " + (i + 1)]) },
    ]} onSubmit={async data => { await save({ ...editing, ...data, startAt: new Date(data.startAt).toISOString(), endAt: new Date(data.endAt).toISOString(), capacity: data.capacity ? Number(data.capacity) : null, eligibility: { departmentIds: data.departmentIds, years: data.years.map(Number) } }); setOpen(false); }} /></Modal>}
  </>;
}
function Registrations({ path, spaceId }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["space", spaceId, "registrations", path], queryFn: () => api(path), enabled: open });
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>Registrations</summary>{query.error && <p role="alert">{query.error.message}</p>}{query.data?.data.map(r => <p key={r._id}>{r.userId?.name} · {r.status}</p>)}{query.data?.data.length === 0 && <p>No registrations yet.</p>}</details>;
}
