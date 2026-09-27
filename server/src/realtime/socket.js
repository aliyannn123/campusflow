import { Server } from "socket.io";
import User from "../modules/users/user.model.js";
import { requireSpace } from "../modules/spaces/space.service.js";
let io;
export function emitSpace(spaceId, event = "space:changed") { io?.to("space:" + spaceId).emit(event, { spaceId: String(spaceId) }); }
export function emitUser(userId, event) { io?.to("user:" + userId).emit(event); }
export function disconnectUser(userId) { io?.in("user:" + userId).disconnectSockets(true); }
export function disconnectSession(sessionId) { io?.in("session:" + sessionId).disconnectSockets(true); }
export function configureSocket(server, sessionMiddleware) {
  io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }, maxHttpBufferSize: 10000 });
  io.engine.use(sessionMiddleware);
  io.use(async (socket, next) => {
    try {
      if (socket.handshake.headers.origin && socket.handshake.headers.origin !== (process.env.CLIENT_ORIGIN || "http://localhost:5173")) throw new Error("Origin not allowed");
      const user = await User.findById(socket.request.session?.userId);
      if (!user || user.accountStatus !== "ACTIVE" || !user.emailVerified || !user.onboardingCompleted || socket.request.session.version !== (user.sessionVersion || 0) || !socket.request.session.loginAt || Date.now() - socket.request.session.loginAt > 7 * 86400000) throw new Error("Authentication required");
      socket.data.userId = String(user._id);
      next();
    } catch { next(new Error("Authentication required")); }
  });
  io.on("connection", socket => {
    socket.join("user:" + socket.data.userId);
    socket.join("session:" + socket.request.sessionID);
    async function allowed(spaceId) {
      await new Promise((resolve, reject) => socket.request.session.reload(error => error ? reject(error) : resolve()));
      const user = await User.findById(socket.request.session.userId);
      if (!user || user.accountStatus !== "ACTIVE" || socket.request.session.version !== (user.sessionVersion || 0) || !socket.request.session.loginAt || Date.now() - socket.request.session.loginAt > 7 * 86400000) throw new Error("Session expired");
      return requireSpace(user._id, spaceId);
    }
    socket.on("space:join", async (spaceId, callback) => {
      try { await allowed(spaceId); await socket.join("space:" + spaceId); if (typeof callback === "function") callback({ ok: true }); }
      catch { if (typeof callback === "function") callback({ ok: false }); }
    });
    socket.on("space:leave", spaceId => { if (typeof spaceId === "string") socket.leave("space:" + spaceId); });
    let lastTyping = 0;
    socket.on("typing", async spaceId => {
      if (Date.now() - lastTyping < 1500) return;
      lastTyping = Date.now();
      try { await allowed(spaceId); socket.to("space:" + spaceId).emit("typing", { spaceId, userId: socket.data.userId }); } catch { /* No broadcast without current access. */ }
    });
  });
  return io;
}
