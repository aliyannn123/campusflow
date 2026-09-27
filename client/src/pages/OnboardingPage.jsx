import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/apiClient.js";
import { useAuth, landingPath } from "../features/auth/useAuth.js";
export default function OnboardingPage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [departmentId, setDepartment] = useState("");
  const [programId, setProgram] = useState("");
  const [sectionId, setSection] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const faculty = user.accountType === "FACULTY";
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api("/academic/departments") });
  const programs = useQuery({ queryKey: ["programs", departmentId], queryFn: () => api("/academic/programs?departmentId=" + departmentId), enabled: !!departmentId && !faculty });
  const sections = useQuery({ queryKey: ["sections", programId], queryFn: () => api("/academic/sections?programId=" + programId), enabled: !!programId && !faculty });
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/users/me/onboarding", { method: "post", data: values });
      navigate(landingPath(await refresh()), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const loadError = departments.error || programs.error || sections.error;
  return <main className="auth-card"><h1>Your academic profile</h1><p>Connect to your department and campus spaces.</p>
    {loadError && <p role="alert">{loadError.message}</p>}
    <form onSubmit={submit}>
      <label>Department<select name="departmentId" value={departmentId} required onChange={event => { setDepartment(event.target.value); setProgram(""); setSection(""); }}>
        <option value="">Select department</option>{departments.data?.data.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
      </select></label>
      {faculty ? <><label>Designation<input name="designation" required minLength={2} maxLength={100} /></label><label>Faculty ID (optional)<input name="facultyId" maxLength={100} /></label></> :
        <><label>Program<select name="programId" value={programId} required disabled={!departmentId} onChange={event => { setProgram(event.target.value); setSection(""); }}>
          <option value="">Select program</option>{programs.data?.data.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select></label><label>Class<select name="sectionId" value={sectionId} required disabled={!programId} onChange={event => setSection(event.target.value)}>
          <option value="">Select year, semester and section</option>{sections.data?.data.map(item => <option key={item._id} value={item._id}>Year {item.year} · Semester {item.semester} · Section {item.name}</option>)}
        </select></label><label>Student ID (optional)<input name="studentId" maxLength={100} /></label></>}
      {error && <p role="alert">{error}</p>}
      {departments.isSuccess && !departments.data?.data.length && <p>No departments are available yet. Ask your administrator to set up the academic structure.</p>}
      <button disabled={busy || departments.isPending}>{busy ? "Saving…" : "Continue"}</button>
    </form><button className="secondary" onClick={() => logout().then(() => navigate("/login")).catch(err => setError(err.message))}>Log out</button>
  </main>;
}
