import ClubEvents from "../features/spaces/ClubEvents.jsx";
import Modal from "../components/Modal.jsx";
import FormModal from "../components/FormModal.jsx";
import AcknowledgementStats from "../components/AcknowledgementStats.jsx";
import Attachments, { UploadForm } from "../components/Attachments.jsx";
import ReportButton from "../components/ReportButton.jsx";
import Polls from "../features/spaces/Polls.jsx";
import { useState } from "react";
import { NavLink, useParams } from "react-router";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useAuth } from "../features/auth/useAuth.js";
import ContentForm from "../components/ContentForm.jsx";
import { useSpaceSocket } from "../hooks/useSpaceSocket.js";
const endpoints = { announcements: "announcements", discussion: "messages", doubts: "questions", resources: "resources", assignments: "assignments", schedule: "schedule", members: "members" };
const fields = {
  announcements: [{ name: "acknowledgementRequired", label: "Require acknowledgement", type: "checkbox", optional: true }, { name: "title", label: "Title" }, { name: "body", label: "Announcement", type: "textarea" }, { name: "priority", label: "Priority", options: [["NORMAL", "Normal"], ["IMPORTANT", "Important"], ["URGENT", "Urgent"]] }],
  resources: [{ name: "title", label: "Title" }, { name: "description", label: "Description", type: "textarea", optional: true, max: 2000 }, { name: "url", label: "Resource URL", type: "url" }, { name: "category", label: "Category", options: ["NOTES", "SLIDES", "REFERENCE", "RECORDING", "OTHER"].map(v => [v, v.toLowerCase()]) }],
  doubts: [{ name: "title", label: "Question" }, { name: "body", label: "What do you need help with?", type: "textarea" }],
  assignments: [{ name: "title", label: "Title" }, { name: "instructions", label: "Instructions", type: "textarea" }, { name: "dueAt", label: "Deadline", type: "datetime-local" }],
  schedule: [{ name: "dayOfWeek", label: "Day", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => [i + 1, day]) }, { name: "startTime", label: "Starts at", type: "time" }, { name: "endTime", label: "Ends at", type: "time" }, { name: "location", label: "Location", optional: true }],
};
const time = minutes => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
export default function SpacePage() {
  const { spaceId, tab = "overview" } = useParams();
  const { user } = useAuth(), queries = useQueryClient();
  const [assignmentEdit, setAssignmentEdit] = useState(null);
  const [error, setError] = useState(""), [reply, setReply] = useState(null), [editing, setEditing] = useState(null);
  const { typing, sendTyping } = useSpaceSocket(spaceId);
  const base = "/spaces/" + spaceId;
  const workspace = useQuery({ queryKey: ["space", spaceId], queryFn: () => api(base) });
  const contentRecords = useQuery({ queryKey: ["space", spaceId, tab], queryFn: () => api(base + "/" + endpoints[tab]), enabled: tab !== "discussion" && !!endpoints[tab] && workspace.isSuccess });
  const discussion = useInfiniteQuery({ queryKey: ["space", spaceId, "discussion"], initialPageParam: null, queryFn: ({ pageParam }) => api(base + "/messages" + (pageParam ? "?before=" + pageParam : "")), getNextPageParam: page => page.nextCursor || undefined, maxPages: 10, enabled: tab === "discussion" && workspace.isSuccess });
  const messages = discussion.data?.pages.toReversed().flatMap(page => page.data) || [];
  const records = tab === "discussion" ? { ...discussion, data: { data: messages } } : contentRecords;
  const messageIds = messages.map(m => m._id).join(",");
  const mentionMembers = useQuery({ queryKey: ["space", spaceId, "mention-members"], queryFn: () => api(base + "/members"), enabled: tab === "discussion" && workspace.isSuccess });
  const reactions = useQuery({ queryKey: ["space", spaceId, "reactions", messageIds], queryFn: () => api(base + "/reactions" + (messageIds ? "?ids=" + messageIds : "")), enabled: tab === "discussion" && workspace.isSuccess });
  async function action(path, method = "post", data = {}) {
    const result = await api(base + path, { method, data });
    await queries.invalidateQueries({ queryKey: ["space", spaceId] });
    queries.invalidateQueries({ queryKey: ["dashboard"] }); queries.invalidateQueries({ queryKey: ["calendar"] });
    return result;
  }
  async function click(path, method, data) { setError(""); try { await action(path, method, data); } catch (err) { setError(err.message); } }
  if (workspace.isPending) return <p role="status">Loading workspace…</p>;
  if (workspace.error) return <p role="alert">{workspace.error.message}</p>;
  const { space, roles, canManage } = workspace.data.data;
  const canTeach = roles.includes("FACULTY") && space.type === "SUBJECT";
  const tabs = ["overview", "announcements", "discussion", ...(space.type === "SUBJECT" ? ["doubts", "resources", "assignments", "schedule"] : space.type === "CLASS" ? ["resources", "polls", "schedule"] : ["resources", "events"]), "members"];
  if (!tabs.includes(tab)) return <p>This tab is not available.</p>;
  const list = endpoints[tab] ? records.data?.data || [] : [];
  return <>{assignmentEdit && <Modal title="Edit assignment" onClose={() => setAssignmentEdit(null)}><ContentForm fields={fields.assignments} initial={{ ...assignmentEdit, dueAt: new Date(new Date(assignmentEdit.dueAt).getTime() - new Date(assignmentEdit.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) }} label="Save assignment" onSubmit={async data => { await action("/assignments/" + assignmentEdit._id, "patch", { ...data, dueAt: new Date(data.dueAt).toISOString() }); setAssignmentEdit(null); }} /></Modal>}<header className="page-header"><p className="eyebrow">{space.type} WORKSPACE</p><h1>{space.name}</h1><p>{roles.join(" · ")}</p></header>
    <nav className="tabs" aria-label="Workspace tabs">{tabs.map(item => <NavLink key={item} to={base + "/" + item}>{item[0].toUpperCase() + item.slice(1)}</NavLink>)}</nav>
    {error && <p role="alert">{error}</p>}{records.error && <p role="alert">{records.error.message}</p>}
    {tab === "overview" && <div className="card"><h2>Welcome to {space.name}</h2><p>A shared space for announcements, discussion and learning resources.</p>{space.subjectOfferingId && <><p>Subject: {space.subjectOfferingId.subjectId?.code}</p><p>Faculty: {space.subjectOfferingId.primaryFacultyId?.name || "Not assigned"}</p><p>Academic year: {space.subjectOfferingId.academicYear}</p></>}</div>}
    {records.isFetching && endpoints[tab] && <p role="status">Updating…</p>}
    <div className="stack">
      {tab === "discussion" && discussion.hasNextPage && <button className="secondary" disabled={discussion.isFetchingNextPage} onClick={() => discussion.fetchNextPage()}>Load earlier messages</button>}
      {tab === "events" && <ClubEvents spaceId={spaceId} canManage={roles.some(r => ["CLUB_LEAD", "CORE_TEAM"].includes(r))} />}
      {tab === "polls" && <Polls spaceId={spaceId} canManage={canManage} />}
      {tab === "resources" && canManage && <FormModal title="Upload a resource"><UploadForm resource path={"/files/resources/" + spaceId} onDone={() => queries.invalidateQueries({ queryKey: ["space", spaceId] })} /></FormModal>}
      {Array.isArray(list) && list.map(record => <article className="card" key={record._id}>
        {tab === "members" ? <><h3>{record.userId?.name || "Former member"}</h3><p>{record.roles.join(", ")}</p></> :
        tab === "discussion" ? <><div className="row"><strong>{record.senderId?.name || "Member"}</strong><small className="muted">{new Date(record.createdAt).toLocaleString()}{record.editedAt && " · edited"}</small></div>
          {record.replyToMessageId && <p className="muted">Reply: {record.replyToMessageId.status === "DELETED" ? "Deleted message" : record.replyToMessageId.content?.slice(0, 160) || "Earlier message"}</p>}
          <p className="content-text">{record.status === "DELETED" ? "This message was deleted." : record.content}</p>
          {record.status !== "DELETED" && <><Attachments type="MESSAGE" targetId={record._id} canUpload={record.senderId?._id === user.id} /><ReportButton targetType="MESSAGE" targetId={record._id} /></>}
          {record.status !== "DELETED" && <div className="row"><button className="secondary" onClick={() => { setReply(record); setEditing(null); }}>Reply</button>
            {String(record.senderId?._id) === user.id && <button className="secondary" onClick={() => { setEditing(record); setReply(null); }}>Edit</button>}
            {(String(record.senderId?._id) === user.id || canManage) && <button className="secondary" onClick={() => click("/messages/" + record._id, "delete")}>Delete</button>}
            {["👍", "❤️", "🎉", "🤔"].map(emoji => { const matches = reactions.data?.data.filter(r => r.messageId === record._id && r.emoji === emoji) || []; const mine = matches.some(r => r.userId === user.id); return <button className="secondary" aria-pressed={mine} key={emoji} onClick={() => click("/messages/" + record._id + "/reaction", mine ? "delete" : "put", { emoji })}>{emoji} {matches.length || ""}</button>; })}</div>}</> :
        <><div className="row"><h3>{record.title}</h3>{record.priority && <span className="badge">{record.priority}</span>}{record.status === "RESOLVED" && <span className="badge">Resolved</span>}</div>
          <p className="content-text">{record.body || record.description || record.instructions}</p>
          {tab === "resources" && <div className="row">{record.resourceType === "FILE" ? <Attachments type="RESOURCE" targetId={record._id} canUpload={canManage} /> : <a href={record.url} target="_blank" rel="noreferrer">Open resource ↗</a>}<button className="secondary" onClick={() => click("/resources/" + record._id + "/bookmark", record.bookmarked ? "delete" : "put")}>{record.bookmarked ? "Remove bookmark" : "Bookmark"}</button></div>}
          {tab === "announcements" && record.acknowledgementRequired && <><button disabled={record.acknowledged} onClick={() => click("/announcements/" + record._id + "/acknowledgement", "put")}>{record.acknowledged ? "Acknowledged" : "Acknowledge"}</button>{canManage && <FormModal title="View acknowledgements"><AcknowledgementStats path={base + "/announcements/" + record._id + "/acknowledgements"} queryKey={["space", spaceId, "acknowledgements", record._id]} /></FormModal>}</>}
          {tab === "assignments" && <>{canTeach && <button className="secondary" onClick={() => setAssignmentEdit(record)}>Edit assignment</button>}<p>Due {new Date(record.dueAt).toLocaleString()} {record.isOverdue && <strong> · Overdue</strong>}</p>{roles.includes("STUDENT") && <button className="secondary" onClick={() => click("/assignments/" + record._id + "/progress", "put", { status: record.progress === "COMPLETED" ? "PENDING" : "COMPLETED" })}>{record.progress === "COMPLETED" ? "Mark pending" : "Mark complete"}</button>}</>}
          {tab === "doubts" && <Answers question={record} base={base} canResolve={canManage || record.askedById?._id === user.id} action={action} />}
          {canManage && ["announcements", "resources", "assignments"].includes(tab) && <button className="secondary" onClick={() => click("/" + endpoints[tab] + "/" + record._id, "delete")}>Remove</button>}
        </>}
      </article>)}
      {Array.isArray(list) && !list.length && endpoints[tab] && !records.isPending && <div className="empty-state">Nothing here yet.</div>}
      {tab === "discussion" && <section className="card">
        {(reply || editing) && <div className="row"><p>{editing ? "Editing your message" : "Replying to " + reply.senderId?.name}</p><button className="secondary" onClick={() => { setReply(null); setEditing(null); }}>Cancel</button></div>}
        {typing && <p className="muted">Someone is typing…</p>}
        <div onInput={sendTyping}><ContentForm key={editing?._id || "new"} fields={[{ name: "content", label: "Message", type: "textarea", max: 4000 }, ...(!editing ? [{ name: "mentionedUserIds", label: "Mention members (optional)", multiple: true, optional: true, options: (mentionMembers.data?.data || []).filter(m => m.userId && m.userId._id !== user.id).map(m => [m.userId._id, m.userId.name]) }] : [])]} initial={{ content: editing?.content }} label={editing ? "Save changes" : "Send message"} onSubmit={async data => { await action(editing ? "/messages/" + editing._id : "/messages", editing ? "patch" : "post", { ...data, replyToMessageId: reply?._id }); setReply(null); setEditing(null); }} /></div>
      </section>}
      {tab === "schedule" && <><div className="card">{list.schedules?.map(record => <div className="row" key={record._id}><strong>{["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][record.dayOfWeek]}</strong><span>{time(record.startMinutes)}–{time(record.endMinutes)} · {record.location}</span>{canTeach && <button className="secondary" onClick={() => click("/schedule/" + record._id, "delete")}>Remove</button>}</div>)}{!list.schedules?.length && <p>No weekly classes scheduled.</p>}</div>
        {list.exceptions?.map(record => <div className="card" key={record._id}><h3>{record.type} · {record.localDate}</h3><p>{record.reason}</p>{canTeach && <button className="secondary" onClick={() => click("/schedule/exceptions/" + record._id, "delete")}>Remove exception</button>}</div>)}
        {canTeach && <FormModal title="Change one occurrence"><ContentForm fields={[
          { name: "type", label: "Change", options: [["CANCELLED", "Cancel"], ["MOVED", "Change time"], ["EXTRA", "Extra class"]] },
          { name: "scheduleId", label: "Weekly class (leave blank for extra class)", options: [["", "Extra class"], ...(list.schedules || []).map(s => [s._id, "Day " + s.dayOfWeek + " · " + time(s.startMinutes)])], optional: true },
          { name: "localDate", label: "Date", type: "date" }, { name: "startTime", label: "New start time", type: "time", optional: true }, { name: "endTime", label: "New end time", type: "time", optional: true }, { name: "reason", label: "Reason", optional: true },
        ]} onSubmit={data => { const toMinutes = value => value ? Number(value.split(":")[0]) * 60 + Number(value.split(":")[1]) : null; return action("/schedule/exceptions", "post", { ...data, scheduleId: data.scheduleId || null, startMinutes: toMinutes(data.startTime), endMinutes: toMinutes(data.endTime) }); }} /></FormModal>}
      </>}
      {fields[tab] && (tab === "doubts" || (["schedule", "assignments"].includes(tab) ? canTeach : canManage)) && <FormModal title={"Add " + (tab === "doubts" ? "a question" : tab === "schedule" ? "a weekly class" : tab)}><ContentForm key={tab} fields={fields[tab]} onSubmit={data => {
        if (tab === "assignments") data.dueAt = new Date(data.dueAt).toISOString();
        if (tab === "schedule") { const minutes = value => Number(value.split(":")[0]) * 60 + Number(value.split(":")[1]); data.startMinutes = minutes(data.startTime); data.endMinutes = minutes(data.endTime); }
        return action("/" + endpoints[tab], "post", data);
      }} /></FormModal>}
    </div>
  </>;
}
function Answers({ question, base, canResolve, action }) {
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  const { spaceId } = useParams();
  const answers = useQuery({ queryKey: ["space", spaceId, "answers", question._id], queryFn: () => api(base + "/questions/" + question._id + "/answers"), enabled: open });
  return <><button className="secondary" onClick={() => setOpen(!open)}>{open ? "Hide answers" : "Answers (" + question.answerCount + ")"}</button>
    {open && <div className="stack">{answers.error && <p role="alert">{answers.error.message}</p>}{error && <p role="alert">{error}</p>}
      {answers.data?.data.map(answer => <div className="card" key={answer._id}><strong>{answer.authorId?.name}</strong><p className="content-text">{answer.body}</p>
        {question.acceptedAnswerId === answer._id ? <span className="badge">Accepted answer</span> : canResolve && <button className="secondary" onClick={() => action("/questions/" + question._id + "/accepted-answer", "put", { answerId: answer._id }).catch(err => setError(err.message))}>Accept answer</button>}</div>)}
      <ContentForm fields={[{ name: "body", label: "Your answer", type: "textarea" }]} label="Post answer" onSubmit={data => action("/questions/" + question._id + "/answers", "post", data)} />
    </div>}
  </>;
}
