import { io } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Home, BookOpen, Users, Building2, CalendarDays, Bell, Search, Settings, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../features/auth/useAuth.js";
const links = [["/home", "Home", Home], ["/academic", "Academic", BookOpen], ["/community", "Community", Users], ["/campus", "Campus", Building2], ["/calendar", "Calendar", CalendarDays], ["/notifications", "Notifications", Bell], ["/search", "Search", Search], ["/settings", "Settings", Settings]];
export default function AppLayout() {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queries = useQueryClient();
  useEffect(() => { const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, { withCredentials: true }); socket.on("notifications:changed", () => queries.invalidateQueries({ queryKey: ["notifications"] })); socket.on("calendar:changed", () => { for (const key of ["calendar", "dashboard", "campus"]) queries.invalidateQueries({ queryKey: [key] }); }); return () => socket.disconnect(); }, [queries]);
  const organization = useQuery({ queryKey: ["organization"], queryFn: () => api("/organization") });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api("/notifications") });
  return <div className="app-shell"><aside className="sidebar"><NavLink className="brand" to="/home">CampusFlow<span>YOUR CAMPUS, CONNECTED</span></NavLink>
    <nav aria-label="Main navigation">{links.map(([to, label, Icon]) => <NavLink key={to} to={to}><Icon size={19} />{label}{to === "/notifications" && notifications.data?.unreadCount > 0 && <span className="badge">{notifications.data.unreadCount}</span>}</NavLink>)}
      {user.globalRoles.some(role => ["COLLEGE_ADMIN", "PLACEMENT_COORDINATOR"].includes(role)) && <NavLink to={user.globalRoles.includes("COLLEGE_ADMIN") ? "/admin" : "/admin/placements"}><ShieldCheck size={19} />Administration</NavLink>}
    </nav><div className="account"><strong>{user.name}</strong><small>{user.accountType === "FACULTY" ? "Faculty" : "Student"}</small>
      <button className="secondary" onClick={() => logout().then(() => navigate("/login")).catch(err => setError(err.message))}><LogOut size={16} />Log out</button>
      {error && <p role="alert">{error}</p>}
    </div></aside><div className="workspace"><header className="topbar"><span className="row">{organization.data?.data.logoFileId && <img alt="" width="32" height="32" src={"/api/v1/files/" + organization.data.data.logoFileId} />}{organization.data?.data.shortName || "CampusFlow"} / Workspace</span><span className="avatar">{user.name.slice(0, 1)}</span></header><main className="page"><Outlet /></main></div></div>;
}
