import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
const iso = date => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
export default function CalendarPage() {
  const [date, setDate] = useState(new Date()), [params, setParams] = useSearchParams();
  const view = params.get("view") === "week" ? "week" : "month";
  const start = new Date(date), end = new Date(date);
  if (view === "month") { start.setDate(1); end.setMonth(end.getMonth() + 1, 0); }
  else { start.setDate(start.getDate() - (start.getDay() + 6) % 7); end.setTime(start.getTime()); end.setDate(end.getDate() + 6); }
  const from = iso(start), to = iso(end);
  const query = useQuery({ queryKey: ["calendar", from, to], queryFn: () => api("/calendar?from=" + from + "&to=" + to) });
  function move(direction) { const next = new Date(date); if (view === "month") { next.setDate(1); next.setMonth(next.getMonth() + direction); } else next.setDate(next.getDate() + direction * 7); setDate(next); }
  const days = []; for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return <><header className="page-header"><p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h1>Calendar</h1><p>Classes, deadlines and campus events in one place.</p></header>
    <div className="toolbar"><div className="row"><button className="secondary" onClick={() => move(-1)} aria-label="Previous period">←</button><button className="secondary" onClick={() => setDate(new Date())}>Today</button><button className="secondary" onClick={() => move(1)} aria-label="Next period">→</button><strong>{date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong></div><div className="row">{["month", "week"].map(v => <button className={view === v ? "" : "secondary"} key={v} onClick={() => setParams({ view: v })}>{v}</button>)}</div></div>
    {query.error && <p role="alert">{query.error.message}</p>}{query.isPending && <p role="status">Loading calendar…</p>}<p className="muted">College timezone: {query.data?.data.timezone || "Asia/Kolkata"}</p>
    <div className="calendar-grid">{Array.from({ length: (start.getDay() + 6) % 7 }, (_, i) => <div key={"blank" + i} className="calendar-blank" aria-hidden="true" />)}{days.map(day => { const dayKey = iso(day); const events = query.data?.data.items.filter(item => new Intl.DateTimeFormat("en-CA", { timeZone: query.data.data.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.startAt)) === dayKey) || []; return <section className="calendar-day" key={dayKey}><strong>{day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</strong>{events.map(item => <Link key={item.id} to={item.destination} className="calendar-event"><small>{item.type}</small><span>{item.title}</span><small>{new Date(item.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: query.data.data.timezone })}{item.completed && " · Complete"}</small></Link>)}</section>; })}</div>
  </>;
}
