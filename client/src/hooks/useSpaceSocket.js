import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
export function useSpaceSocket(spaceId) {
  const queries = useQueryClient();
  const socket = useRef(null);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!spaceId) return;
    const connection = io(import.meta.env.VITE_SOCKET_URL || undefined, { withCredentials: true });
    let timeout;
    connection.on("connect", () => connection.emit("space:join", spaceId));
    connection.on("space:changed", () => { queries.invalidateQueries({ queryKey: ["space", spaceId] }); queries.invalidateQueries({ queryKey: ["dashboard"] }); });
    connection.on("typing", () => { setTyping(true); clearTimeout(timeout); timeout = setTimeout(() => setTyping(false), 2500); });
    socket.current = connection;
    return () => { clearTimeout(timeout); connection.disconnect(); };
  }, [spaceId, queries]);
  return { typing, sendTyping: () => socket.current?.emit("typing", spaceId) };
}
