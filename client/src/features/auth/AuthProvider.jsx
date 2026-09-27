import { useEffect, useState } from "react";
import { api, setCsrfToken } from "../../lib/apiClient.js";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./useAuth.js";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const queries = useQueryClient();
  function acceptSession(result) {
    queries.clear();
    setCsrfToken(result.data.csrfToken);
    setUser(result.data.user);
  }
  async function refresh() {
    const result = await api("/users/me");
    setCsrfToken(result.data.csrfToken);
    setUser(result.data.user);
    return result.data.user;
  }
  useEffect(() => {
    let cancelled = false;
    api("/users/me").then(result => {
      if (!cancelled) { setCsrfToken(result.data.csrfToken); setUser(result.data.user); }
    }).catch(err => { if (!cancelled && err.response?.status !== 401) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function logout() {
    await api("/auth/logout", { method: "post", data: {} });
    setUser(null); setCsrfToken(null); queries.clear();
  }
  return <AuthContext.Provider value={{ user, loading, error, acceptSession, refresh, logout }}>{children}</AuthContext.Provider>;
}
