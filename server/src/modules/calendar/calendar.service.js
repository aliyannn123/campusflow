import { getOrganization } from "../organization/organization.service.js";
import { DateTime } from "luxon";
import { accessibleSpaces } from "../spaces/space.service.js";
import Schedule from "../schedule/subject-schedule.model.js";
import Exception from "../schedule/schedule-exception.model.js";
import Assignment from "../assignments/assignment.model.js";
import AssignmentProgress from "../assignments/assignment-progress.model.js";
import { fail } from "../../lib/errors.js";
import User from "../users/user.model.js";
import Event from "../events/event.model.js";
import Registration from "../events/event-registration.model.js";
import Placement from "../placements/placement.model.js";
import { placementEligibility } from "../campus/eligibility.js";
export async function calendar(userId, from, to) {
  const zone = (await getOrganization()).timezone;
  const start = DateTime.fromISO(from, { zone }).startOf("day");
  const end = DateTime.fromISO(to, { zone }).endOf("day");
  if (!start.isValid || !end.isValid || end < start || end.diff(start, "days").days > 93) fail(400, "Choose a valid date range of at most 93 days.");
  const spaces = await accessibleSpaces(userId);
  const ids = spaces.map(s => s._id);
  const [schedules, exceptions, assignments, progress] = await Promise.all([
    Schedule.find({ spaceId: { $in: ids }, status: "ACTIVE" }).lean(),
    Exception.find({ spaceId: { $in: ids }, status: "ACTIVE", localDate: { $gte: from, $lte: to } }).lean(),
    Assignment.find({ spaceId: { $in: ids }, status: "ACTIVE", dueAt: { $gte: start.toJSDate(), $lte: end.toJSDate() } }).lean(),
    AssignmentProgress.find({ userId, status: "COMPLETED" }).lean(),
  ]);
  const items = [];
  const name = spaceId => spaces.find(s => String(s._id) === String(spaceId))?.name || "Class";
  const occurrence = (record, date, suffix) => ({
    id: String(record._id) + ":" + date.toISODate() + suffix, type: "CLASS", title: name(record.spaceId),
    startAt: date.startOf("day").plus({ minutes: record.startMinutes }).toISO(), endAt: date.startOf("day").plus({ minutes: record.endMinutes }).toISO(),
    location: record.location, destination: "/spaces/" + record.spaceId + "/schedule",
  });
  for (let date = start; date <= end; date = date.plus({ days: 1 })) {
    for (const schedule of schedules.filter(s => s.dayOfWeek === date.weekday)) {
      const exception = exceptions.find(e => String(e.scheduleId) === String(schedule._id) && e.localDate === date.toISODate());
      if (exception?.type === "CANCELLED") continue;
      items.push(occurrence(exception || schedule, date, ""));
    }
    for (const extra of exceptions.filter(e => e.type === "EXTRA" && e.localDate === date.toISODate())) items.push(occurrence(extra, date, ":extra"));
  }
  for (const assignment of assignments) items.push({ id: String(assignment._id), type: "ASSIGNMENT", title: assignment.title, startAt: assignment.dueAt, completed: progress.some(p => String(p.assignmentId) === String(assignment._id)), destination: "/spaces/" + assignment.spaceId + "/assignments" });
  const user = await User.findById(userId);
  const registrations = await Registration.find({ userId, status: "REGISTERED" }).select("eventId");
  const [events, placements] = await Promise.all([
    Event.find({ _id: { $in: registrations.map(r => r.eventId) }, status: "ACTIVE", startAt: { $gte: start.toJSDate(), $lte: end.toJSDate() } }).lean(),
    Placement.find({ status: "ACTIVE", deadlineAt: { $gte: start.toJSDate(), $lte: end.toJSDate() } }).lean(),
  ]);
  for (const event of events) items.push({ id: String(event._id), type: "EVENT", title: event.title, startAt: event.startAt, endAt: event.endAt, location: event.location, destination: "/campus/events" });
  for (const placement of placements.filter(p => user && placementEligibility(user, p.eligibility) === "ELIGIBLE")) items.push({ id: String(placement._id), type: "PLACEMENT", title: placement.companyName + " · " + placement.roleTitle, startAt: placement.deadlineAt, destination: "/campus/placements" });
  return { timezone: zone, items: items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt)) };
}
