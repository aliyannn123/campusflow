import Organization from "./organization.model.js";
export async function getOrganization() {
  return Organization.findOneAndUpdate({ organizationKey: "PRIMARY" }, { $setOnInsert: {
    name: process.env.COLLEGE_NAME || "Walchand College of Engineering",
    shortName: "WCE", allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || "walchandsangli.ac.in",
    currentAcademicYear: process.env.ACADEMIC_YEAR || "2026-2027", timezone: process.env.COLLEGE_TIMEZONE || "Asia/Kolkata",
  } }, { upsert: true, returnDocument: "after" });
}
