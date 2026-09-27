import { Navigate, Outlet } from "react-router";
import { useAuth, landingPath } from "./useAuth.js";
export default function ProtectedRoute({ active = false }) {
  const { user, loading, error } = useAuth();
  if (loading) return <p role="status">Loading your account…</p>;
  if (error) return <p role="alert">{error} <button onClick={() => window.location.reload()}>Retry</button></p>;
  if (!user) return <Navigate to="/login" replace />;
  if (active && landingPath(user) !== "/home") return <Navigate to={landingPath(user)} replace />;
  return <Outlet />;
}
