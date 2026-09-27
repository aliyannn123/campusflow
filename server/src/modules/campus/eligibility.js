export function audienceMatches(user, audience = {}) {
  const profile = user.requestedAccountType === "FACULTY" ? user.facultyProfile : user.academicProfile;
  return (!audience.accountTypes?.length || audience.accountTypes.includes(user.requestedAccountType))
    && (!audience.departmentIds?.length || audience.departmentIds.some(id => String(id) === String(profile?.departmentId)))
    && (!audience.years?.length || audience.years.includes(profile?.year));
}
export function placementEligibility(user, rules = {}) {
  if (user.requestedAccountType !== "STUDENT") return "INELIGIBLE";
  if (!audienceMatches(user, rules)) return "INELIGIBLE";
  const p = user.academicProfile || {};
  if (rules.graduationYears?.length && p.graduationYear != null && !rules.graduationYears.includes(p.graduationYear)) return "INELIGIBLE";
  if (rules.minCGPA != null && p.cgpa != null && p.cgpa < rules.minCGPA) return "INELIGIBLE";
  if (rules.maxActiveBacklogs != null && p.activeBacklogs != null && p.activeBacklogs > rules.maxActiveBacklogs) return "INELIGIBLE";
  if ((rules.graduationYears?.length && p.graduationYear == null) || (rules.minCGPA != null && p.cgpa == null) || (rules.maxActiveBacklogs != null && p.activeBacklogs == null)) return "UNKNOWN";
  return "ELIGIBLE";
}
