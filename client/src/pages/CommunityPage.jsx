import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
export default function CommunityPage() {
  const [error, setError] = useState(""), [category, setCategory] = useState("ALL"), [tab, setTab] = useState("Discover clubs"), [search, setSearch] = useState("");
  const queries = useQueryClient();
  const query = useQuery({ queryKey: ["clubs"], queryFn: () => api("/clubs") });
  async function act(club, leave = false) {
    setError("");
    try { await api("/clubs/" + club._id + (leave ? "/membership" : "/join"), { method: leave ? "delete" : "post", data: {} }); await queries.invalidateQueries({ queryKey: ["clubs"] }); queries.invalidateQueries({ queryKey: ["spaces"] }); queries.invalidateQueries({ queryKey: ["campus"] }); queries.invalidateQueries({ queryKey: ["calendar"] }); }
    catch (err) { setError(err.message); }
  }
  const clubs = query.data?.data || [];
  const visible = clubs.filter(club => (category === "ALL" || club.category === category) && (tab === "My clubs" ? club.membership?.status === "ACTIVE" : club.membership?.status !== "ACTIVE") && (club.name + " " + club.description).toLowerCase().includes(search.toLowerCase()));
  return <><header className="page-header"><p className="eyebrow">FIND YOUR PEOPLE</p><h1>Community</h1><p>Build something together. Explore clubs and get involved.</p></header>
    <div className="tabs" role="tablist" aria-label="Clubs">{["My clubs", "Discover clubs"].map(value => <button className={tab === value ? "" : "secondary"} role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{value}</button>)}</div><label>Search clubs<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{["ALL", "TECHNICAL", "CULTURAL", "SPORTS", "CREATIVE", "SOCIAL", "ENTREPRENEURSHIP", "OTHER"].map(value => <option key={value}>{value}</option>)}</select></label>
    {(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.isPending && <p role="status">Loading clubs…</p>}
    {[tab].map(heading => <section key={heading}><h2>{heading}</h2><div className="card-grid">{visible.map(club => <article className="card" key={club._id}><span className="badge">{club.category}</span><h3>{club.name}</h3><p>{club.description}</p>
      {club.membership?.status === "ACTIVE" ? <><Link to={"/spaces/" + club.spaceId}>Open club workspace →</Link><button className="secondary" onClick={() => act(club, true)}>Leave club</button>{club.membership.roles.some(r => ["CLUB_LEAD", "CORE_TEAM"].includes(r)) && <Requests club={club} />}</> : <button disabled={club.membership?.status === "PENDING"} onClick={() => act(club)}>{club.membership?.status === "PENDING" ? "Request pending" : club.joinPolicy === "OPEN" ? "Join club" : "Request to join"}</button>}
    </article>)}</div></section>)}
    {query.isSuccess && !visible.length && <div className="empty-state">No clubs match this view. Try another tab or search.</div>}
  </>;
}
function Requests({ club }) {
  const query = useQuery({ queryKey: ["club-requests", club._id], queryFn: () => api("/clubs/" + club._id + "/requests") }), queries = useQueryClient();
  const [error, setError] = useState("");
  async function decide(userId, status) { try { await api("/clubs/" + club._id + "/requests/" + userId, { method: "put", data: { status } }); await queries.invalidateQueries({ queryKey: ["club-requests", club._id] }); } catch (err) { setError(err.message); } }
  return <details><summary>Join requests ({query.data?.data.length || 0})</summary>{error && <p role="alert">{error}</p>}{query.data?.data.map(m => <div className="row" key={m._id}><span>{m.userId?.name}</span><button onClick={() => decide(m.userId._id, "ACTIVE")}>Approve</button><button className="secondary" onClick={() => decide(m.userId._id, "INACTIVE")}>Decline</button></div>)}</details>;
}
