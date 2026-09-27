import createApp from "./app.js";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { validateEnvironment } from "./config/environment.js";
import { getOrganization } from "./modules/organization/organization.service.js";
import { createServer } from "node:http";
import { configureSocket } from "./realtime/socket.js";
import { startAssignmentReminders } from "./jobs/assignment-reminders.js";
const PORT = Number(process.env.PORT || 5000);
async function startServer() {
  try {
    validateEnvironment();
    await connectDatabase();
    await getOrganization();
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const app = createApp();
    const server = createServer(app);
    const io = configureSocket(server, app.locals.sessionMiddleware);
    const stopReminders = startAssignmentReminders();
    server.listen(PORT, "0.0.0.0", () => console.log("CampusFlow is listening on port " + PORT));
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true; stopReminders();
      const force = setTimeout(() => process.exit(1), 10000); force.unref();
      io.close();
      server.close(async () => { await mongoose.disconnect(); clearTimeout(force); process.exit(0); });
    };
    process.on("SIGTERM", stop); process.on("SIGINT", stop);
  } catch (error) { console.error("Failed to start CampusFlow:", error.name, error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[database URI redacted]")); process.exit(1); }
}
startServer();
