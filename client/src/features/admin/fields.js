const f = (name, label, type = "text", optional = false) => ({ name, label, type, optional });
export const options = (name, label, values) => ({ name, label, options: values.map(value => Array.isArray(value) ? value : [value, value.replaceAll("_", " ")]) });
export function recordFields(section, lookup) {
  const ref = (name, label, type, optional = false) => ({ name, label, optional, options: [["", "Select " + label.toLowerCase()], ...(lookup[type] || []).map(item => [item._id || item.id, item.name || item.email || item.title])] });
  const title = f("title", "Title"), description = f("description", "Description", "textarea"), status = options("status", "Status", ["ACTIVE", "INACTIVE"]);
  const fields = ({
    departments: [f("name", "Department name"), f("shortName", "Short name"), status],
    programs: [ref("departmentId", "Department", "departments"), f("name", "Program name"), f("shortName", "Short name"), f("durationYears", "Duration in years", "number"), status],
    sections: [ref("programId", "Program", "programs"), f("name", "Section name"), f("year", "Year", "number"), f("semester", "Semester", "number"), status],
    subjects: [ref("departmentId", "Department", "departments"), f("name", "Subject name"), f("code", "Subject code"), status],
    offerings: [ref("subjectId", "Subject", "subjects"), ref("programId", "Program", "programs"), ref("sectionId", "Section", "sections"), f("academicYear", "Academic year (e.g. 2026-2027)"), ref("primaryFacultyId", "Faculty", "faculty", true), status],
    clubs: [f("name", "Club name"), f("slug", "Short URL name"), description, options("category", "Category", ["TECHNICAL", "CULTURAL", "SPORTS", "CREATIVE", "SOCIAL", "ENTREPRENEURSHIP", "OTHER"]), options("joinPolicy", "Joining policy", ["OPEN", "APPROVAL_REQUIRED"]), status],
    notices: [title, f("body", "Notice", "textarea"), options("priority", "Priority", ["NORMAL", "IMPORTANT", "URGENT"]), f("acknowledgementRequired", "Require acknowledgement", "checkbox", true), f("expiresAt", "Expires at (optional)", "datetime-local", true), options("status", "Status", ["ACTIVE", "REMOVED"])],
    events: [title, description, options("organizerType", "Organizer", ["CAMPUS", "CLUB"]), ref("clubId", "Club", "clubs", true), f("startAt", "Starts", "datetime-local"), f("endAt", "Ends", "datetime-local"), f("location", "Location"), f("capacity", "Capacity (blank for unlimited)", "number", true), options("status", "Status", ["ACTIVE", "CANCELLED"])],
    placements: [f("companyName", "Company"), f("roleTitle", "Role"), options("opportunityType", "Opportunity", ["INTERNSHIP", "PLACEMENT"]), description, f("compensation", "Compensation", "text", true), f("location", "Location"), options("workMode", "Work mode", ["ONSITE", "REMOTE", "HYBRID"]), f("applicationUrl", "Application URL", "url"), f("deadlineAt", "Deadline", "datetime-local"), options("status", "Status", ["ACTIVE", "CLOSED"])],
    organization: [f("name", "College name"), f("shortName", "Short name"), f("allowedEmailDomain", "College email domain"), f("currentAcademicYear", "Academic year"), f("timezone", "College timezone"), f("supportEmail", "Support email", "email", true), f("studentRegistrationEnabled", "Allow student registration", "checkbox", true)],
  })[section] || [];
  if (["notices", "events", "placements"].includes(section)) {
    fields.push({ name: "departmentIds", label: "Departments (none means all)", multiple: true, optional: true, options: (lookup.departments || []).map(d => [d._id, d.name]) }, { name: "years", label: "Years (none means all)", multiple: true, optional: true, options: Array.from({ length: 8 }, (_, i) => [String(i + 1), "Year " + (i + 1)]) });
    if (section === "notices") fields.push({ ...options("accountTypes", "Account types (none means all)", ["STUDENT", "FACULTY"]), multiple: true, optional: true });
    if (section === "placements") fields.push(f("graduationYears", "Graduation years (comma separated, blank for all)", "text", true), { ...f("minCGPA", "Minimum CGPA (optional)", "number", true), step: "0.01", min: 0, max: 10 }, { ...f("maxActiveBacklogs", "Maximum active backlogs (optional)", "number", true), min: 0 });
  }
  return fields;
}
