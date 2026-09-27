import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/apiClient.js";
export default function NotificationsPage() {
  const queries = useQueryClient(), [error, setError] = useState("");
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => api("/notifications") });
  async function read(path) { try { await api(path, { method: "put", data: {} }); await queries.invalidateQueries({ queryKey: ["notifications"] }); } catch (err) { setError(err.message); } }
  return <><header className="page-header"><h1>Notifications</h1><p>{query.data?.unreadCount || 0} unread updates</p></header><button className="secondary" onClick={() => read("/notifications/read-all")}>Mark all read</button>{(error || query.error) && <p role="alert">{error || query.error.message}</p>}
    <div className="stack">{query.data?.data.map(item => <article className="card" key={item._id}><span className="badge">{item.readAt ? "Read" : "New"}</span><Link to={item.destination} onClick={() => read("/notifications/" + item._id + "/read")}><h3>{item.title}</h3></Link><p>{item.message}</p><small className="muted">{new Date(item.createdAt).toLocaleString()}</small></article>)}</div>
    {query.isSuccess && !query.data.data.length && <div className="empty-state">You're up to date.</div>}
  </>;
}
