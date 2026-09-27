import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/apiClient.js";
import ContentForm from "../../components/ContentForm.jsx";
export default function Polls({ spaceId, canManage }) {
  const queries = useQueryClient(), [error, setError] = useState("");
  const key = ["space", spaceId, "polls"], base = "/spaces/" + spaceId + "/polls";
  const query = useQuery({ queryKey: key, queryFn: () => api(base) });
  async function vote(id, optionId) { try { await api(base + "/" + id + "/vote", { method: "put", data: { optionId } }); await queries.invalidateQueries({ queryKey: key }); } catch (err) { setError(err.message); } }
  return <div className="stack">{(error || query.error) && <p role="alert">{error || query.error.message}</p>}{query.data?.data.map(poll => <article className="card" key={poll._id}><h3>{poll.question}</h3><span className="badge">{poll.closed ? "Closed" : "Open"}</span>{poll.options.map(option => <button key={option._id} className={poll.myVote === option._id ? "" : "secondary"} disabled={poll.closed} onClick={() => vote(poll._id, option._id)}>{option.text} · {option.count} vote(s)</button>)}
    {canManage && !poll.closed && <button className="secondary" onClick={async () => { try { await api(base + "/" + poll._id + "/close", { method: "put", data: {} }); await queries.invalidateQueries({ queryKey: key }); } catch (err) { setError(err.message); } }}>Close poll</button>}</article>)}
    {canManage && <details className="card"><summary>Create a poll</summary><ContentForm fields={[{ name: "question", label: "Question" }, { name: "options", label: "Options (one per line)", type: "textarea" }, { name: "closesAt", label: "Closes at", type: "datetime-local", optional: true }]} onSubmit={async data => { await api(base, { method: "post", data: { question: data.question, options: data.options.split("\n").map(s => s.trim()).filter(Boolean), closesAt: data.closesAt ? new Date(data.closesAt).toISOString() : undefined } }); await queries.invalidateQueries({ queryKey: key }); }} /></details>}
  </div>;
}
