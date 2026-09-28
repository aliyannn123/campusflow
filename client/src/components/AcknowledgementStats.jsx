import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
export default function AcknowledgementStats({ path, queryKey }) {
  const query = useQuery({ queryKey, queryFn: () => api(path) });
  if (query.error) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <p role="status">Loading acknowledgements…</p>;
  const s = query.data.statistics;
  return <><div className="row"><span>Targeted: {s.targeted ?? "Not recorded"}</span><span>Acknowledged: {s.acknowledged}</span><span>Pending: {s.pending ?? "Unknown"}</span><span>Rate: {s.rate == null ? "Unavailable" : s.rate + "%"}</span></div>{s.targeted == null && <p>The original audience was not recorded for this older item.</p>}{query.data.data.map(a => <p key={a._id}>{a.userId?.name || "Former member"} · {new Date(a.createdAt).toLocaleString()}</p>)}</>;
}
