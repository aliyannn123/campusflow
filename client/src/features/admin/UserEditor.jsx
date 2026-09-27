import ContentForm from "../../components/ContentForm.jsx";
export default function UserEditor({ person, lookup, action, self }) {
  const student = person.accountType === "STUDENT";
  const ref = (name, label, kind) => ({ name, label, options: [["", "Select " + label], ...(lookup[kind] || []).map(r => [r._id, r.name])] });
  const fields = [ref("departmentId", "Department", "departments"), ...(student ? [ref("programId", "Program", "programs"), ref("sectionId", "Section", "sections"), { name: "studentId", label: "Student ID", optional: true }, { name: "graduationYear", label: "Graduation year", type: "number", optional: true }, { name: "cgpa", label: "Verified CGPA", type: "number", step: "0.01", min: 0, max: 10, optional: true }, { name: "activeBacklogs", label: "Active backlogs", type: "number", min: 0, optional: true }] : [{ name: "designation", label: "Designation" }, { name: "facultyId", label: "Faculty ID", optional: true }])];
  return <details><summary>Edit account</summary>{!self && <ContentForm fields={[{ name: "roles", label: "Additional roles", multiple: true, optional: true, options: ["DEPARTMENT_ADMIN", "PLACEMENT_COORDINATOR", "COLLEGE_ADMIN"].map(r => [r, r.replaceAll("_", " ")]) }]} initial={{ roles: person.globalRoles.filter(r => !["STUDENT", "FACULTY"].includes(r)) }} label="Save roles" onSubmit={data => action("users/" + person.id + "/roles", data)} />}
    <ContentForm fields={fields} initial={person[student ? "academicProfile" : "facultyProfile"] || {}} label="Save academic profile" onSubmit={data => { for (const key of ["graduationYear", "cgpa", "activeBacklogs"]) if (data[key] === "") data[key] = null; return action("users/" + person.id + "/academic-profile", data); }} />
  </details>;
}
