import Assignment from "../modules/assignments/assignment.model.js";
import Progress from "../modules/assignments/assignment-progress.model.js";
import Membership from "../modules/spaces/membership.model.js";
import { notifyUsers } from "../modules/notifications/notification.service.js";
export async function sendAssignmentReminders() {
  const assignments = await Assignment.find({ status: "ACTIVE", dueAt: { $gt: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  for (const assignment of assignments) {
    const [memberships, completed] = await Promise.all([
      Membership.find({ spaceId: assignment.spaceId, status: "ACTIVE", roles: "STUDENT" }),
      Progress.find({ assignmentId: assignment._id, status: "COMPLETED" }).select("userId"),
    ]);
    const done = new Set(completed.map(p => String(p.userId)));
    await notifyUsers({ userIds: memberships.filter(m => !done.has(String(m.userId))).map(m => m.userId), spaceId: assignment.spaceId, type: "REMINDER", sourceId: assignment._id, title: "Due soon: " + assignment.title, message: "Your assignment is due in the next 24 hours.", priority: "IMPORTANT", destination: "/spaces/" + assignment.spaceId + "/assignments", dedupeKey: "REMINDER:" + assignment._id + ":" + assignment.dueAt.toISOString() });
  }
}
export function startAssignmentReminders() {
  let running = false;
  const run = async () => { if (running) return; running = true; try { await sendAssignmentReminders(); } catch (error) { console.error("Assignment reminder processing failed:", error.name); } finally { running = false; } };
  void run();
  const interval = setInterval(run, 5 * 60 * 1000); interval.unref();
  return () => clearInterval(interval);
}
