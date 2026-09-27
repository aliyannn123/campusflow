import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useAuth } from "../features/auth/useAuth.js";
export default function HomePage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api("/dashboard") });
  const data = query.data?.data;
  return <><header className="page-header"><p className="eyebrow">{user.accountType === "FACULTY" ? "FACULTY DASHBOARD" : "YOUR CAMPUS AT A GLANCE"}</p><h1>Hello, {user.name.replace(/^(Prof\.|Dr\.)\s*/i, "").split(" ")[0]}.</h1><p>A little clarity for your campus day.</p></header>
    {query.error && <p role="alert">{query.error.message}</p>}{query.isPending && <p role="status">Loading your day…</p>}
    <div className="card-grid"><div className="card"><p>Academic spaces</p><h1>{data?.spaces.filter(s => s.type !== "CLUB").length || 0}</h1><Link to="/academic">Explore your classes →</Link></div><div className="card"><p>{user.accountType === "FACULTY" ? "Published assignments" : "Pending assignments"}</p><h1>{data?.assignments.length || 0}</h1><p>Stay on top of your academic work</p></div><div className="card"><p>This week</p><h1>{data?.agenda.items.length || 0}</h1><Link to="/calendar">View calendar →</Link></div></div>
    {data?.faculty && <section><h2>Teaching overview</h2><p>{data.faculty.studentCount} active students across your subjects.</p><h3>Questions awaiting an answer</h3><div className="stack">{data.faculty.pendingDoubts.map(q => <Link className="card" key={q._id} to={"/spaces/" + q.spaceId + "/doubts"}>{q.title}</Link>)}{!data.faculty.pendingDoubts.length && <p>No unanswered questions.</p>}</div></section>}
    <div className="split"><section><h2>Assignments</h2><div className="stack">{data?.assignments.map(item => <Link className="card" key={item._id} to={"/spaces/" + item.spaceId + "/assignments"}><h3>{item.title}</h3><p>Due {new Date(item.dueAt).toLocaleString()}{new Date(item.dueAt) < new Date() && " · Overdue"}</p>{data.faculty?.completion.filter(c => c.assignmentId === item._id).map(c => <p key={c.assignmentId}>{c.completed} of {c.total} students marked complete</p>)}</Link>)}{data && !data.assignments.length && <div className="empty-state">You're all caught up.</div>}</div><h2>Latest announcements</h2><div className="stack">{data?.announcements.map(item => <Link className="card" key={item._id} to={"/spaces/" + item.spaceId + "/announcements"}><span className="badge">{item.priority}</span><h3>{item.title}</h3><p>{item.body.slice(0, 180)}</p></Link>)}</div></section>
    <section><h2>Coming up</h2><div className="stack">{data?.agenda.items.slice(0, 8).map(item => <Link className="card" key={item.id} to={item.destination}><span className="badge">{item.type}</span><h3>{item.title}</h3><p>{new Date(item.startAt).toLocaleString()}</p></Link>)}{data && !data.agenda.items.length && <div className="empty-state">A clear week ahead.</div>}</div></section></div>
  </>;
}
