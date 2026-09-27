import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
export default function SearchPage() {
  const [params, setParams] = useSearchParams(), q = params.get("q") || "", type = params.get("type") || "ALL";
  const query = useQuery({ queryKey: ["search", q, type], queryFn: () => api("/search?q=" + encodeURIComponent(q) + "&type=" + type), enabled: q.length >= 2 });
  return <><header className="page-header"><h1>Search CampusFlow</h1><p>Find conversations, resources and campus updates you have access to.</p></header>
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setParams({ q: data.get("q"), type: data.get("type") }); }}>
      <label>Search<input name="q" type="search" minLength={2} maxLength={100} required defaultValue={q} /></label>
      <label>Content type<select name="type" defaultValue={type}>{["ALL", "MESSAGE", "RESOURCE", "ASSIGNMENT", "ANNOUNCEMENT", "QUESTION", "EVENT", "NOTICE", "PLACEMENT"].map(value => <option key={value}>{value}</option>)}</select></label><button>Search</button>
    </form>{query.error && <p role="alert">{query.error.message}</p>}{query.isFetching && <p role="status">Searching…</p>}<div className="stack">{query.data?.data.map(item => <Link className="card" key={item.type + item.id} to={item.destination}><span className="badge">{item.type}</span><h3>{item.title}</h3><p>{item.snippet}</p></Link>)}</div>{query.isSuccess && !query.data.data.length && <div className="empty-state">No results. Try a different search.</div>}
  </>;
}
