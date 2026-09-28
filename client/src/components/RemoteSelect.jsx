import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
export default function RemoteSelect({ field, initial }) {
  const labelId = useId();
  const [selected, setSelected] = useState(() => initial == null || initial === "" ? [] : (Array.isArray(initial) ? initial : [initial]).map(String));
  const [text, setText] = useState(""), [q, setQ] = useState(""), [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setQ(text); setPage(1); }, 250); return () => clearTimeout(timer); }, [text]);
  const separator = field.remote.includes("?") ? "&" : "?";
  const query = useQuery({ queryKey: ["admin", "picker", field.remote, q, page], queryFn: () => api(field.remote + separator + new URLSearchParams({ q, page, limit: 25 })) });
  const chosen = useQuery({ queryKey: ["admin", "picker-selected", field.remote, selected.join(",")], queryFn: () => api(field.remote + separator + new URLSearchParams({ ids: selected.join(","), limit: 100 })), enabled: selected.length > 0 });
  const choices = [...new Map([...(chosen.data?.data || []), ...(query.data?.data || [])].map(item => [String(item.id || item._id), item])).values()];
  return <div className="remote-select"><label htmlFor={labelId + "search"}>Find {field.label.toLowerCase()}</label><input id={labelId + "search"} type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Search by name" />
    <label htmlFor={labelId}>{field.label}</label><select id={labelId} name={field.name} multiple={field.multiple} required={!field.optional} value={field.multiple ? selected : selected[0] || ""} onChange={e => setSelected(Array.from(e.target.selectedOptions, o => o.value).filter(Boolean))}>
      {!field.multiple && <option value="">Select {field.label.toLowerCase()}</option>}
      {selected.filter(value => !choices.some(i => String(i.id || i._id) === value)).map(value => <option key={value} value={value}>{chosen.isFetching ? "Loading selected record…" : "Unavailable record — choose a replacement"}</option>)}
      {choices.map(item => <option key={item.id || item._id} value={item.id || item._id}>{item.name || item.title || item.code}{item.email ? " · " + item.email : ""}</option>)}
    </select>{(query.error || chosen.error) && <p role="alert">{(query.error || chosen.error).message}</p>}
    <div className="row"><button type="button" className="secondary" disabled={page === 1 || query.isFetching} onClick={() => setPage(p => p - 1)}>Previous choices</button><span>Page {page} of {query.data?.pagination?.pages || 1}</span><button type="button" className="secondary" disabled={page >= (query.data?.pagination?.pages || 1) || query.isFetching} onClick={() => setPage(p => p + 1)}>More choices</button></div>
  </div>;
}
