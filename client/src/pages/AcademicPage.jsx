import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
export default function AcademicPage() {
  const { data, error, isPending } = useQuery({ queryKey: ["spaces"], queryFn: () => api("/spaces") });
  return <><header className="page-header"><p className="eyebrow">YOUR LEARNING SPACE</p><h1>Academic</h1><p>Your classes, subjects and the people you learn with.</p></header>
    {isPending && <p role="status">Loading your spaces…</p>}{error && <p role="alert">{error.message}</p>}
    {["CLASS", "SUBJECT"].map(type => <section key={type}><h2>{type === "CLASS" ? "My classes" : "My subjects"}</h2><div className="card-grid">
      {data?.data.filter(space => space.type === type).map(space => <Link className="card space-card" key={space._id} to={"/spaces/" + space._id}><span className="badge">{type.toLowerCase()}</span><h3>{space.name}</h3><p>{space.roles.join(", ")}</p><span>Open workspace →</span></Link>)}
    </div>{data && !data.data.some(space => space.type === type) && <div className="empty-state">No {type.toLowerCase()} spaces assigned yet.</div>}</section>)}
  </>;
}
