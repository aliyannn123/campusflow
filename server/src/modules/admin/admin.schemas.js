import { z } from "zod";
import { DateTime } from "luxon";
import { id } from "../../lib/validation.js";
const text = z.string().trim().min(2).max(180);
const optionalText = z.string().trim().max(5000).default("");
const status = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");
const url = z.string().url().refine(v => /^https?:\/\//.test(v), "Use an http or https URL");
const ids = z.array(id).max(100).default([]);
const years = z.array(z.number().int().min(1).max(8)).max(8).default([]);
const audience = z.object({ accountTypes: z.array(z.enum(["STUDENT", "FACULTY"])).default([]), departmentIds: ids, years }).default({});
const eligibility = z.object({ departmentIds: ids, years }).default({});
export const schemas = {
  departments: z.object({ name: text, shortName: text, status }),
  programs: z.object({ departmentId: id, name: text, shortName: text, durationYears: z.coerce.number().int().min(1).max(8), status }),
  sections: z.object({ programId: id, year: z.coerce.number().int().min(1).max(8), semester: z.coerce.number().int().min(1).max(16), name: z.string().trim().min(1).max(30), status }),
  subjects: z.object({ departmentId: id, name: text, code: text, status }),
  offerings: z.object({ subjectId: id, programId: id, sectionId: id, academicYear: z.string().regex(/^\d{4}-\d{4}$/), primaryFacultyId: id.nullable().default(null), status }),
  clubs: z.object({ name: text, slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), description: z.string().trim().max(2000).default(""), category: z.enum(["TECHNICAL", "CULTURAL", "SPORTS", "CREATIVE", "SOCIAL", "ENTREPRENEURSHIP", "OTHER"]), joinPolicy: z.enum(["OPEN", "APPROVAL_REQUIRED"]).default("OPEN"), status }),
  notices: z.object({ title: text, body: z.string().trim().min(1).max(5000), category: z.enum(["GENERAL", "ACADEMIC", "ADMINISTRATIVE", "EMERGENCY", "EVENT", "PLACEMENT", "OTHER"]).default("GENERAL"), priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"), audience, acknowledgementRequired: z.boolean().default(false), expiresAt: z.coerce.date().nullable().default(null), status: z.enum(["ACTIVE", "REMOVED"]).default("ACTIVE") }),
  events: z.object({ title: text, description: z.string().trim().min(1).max(5000), organizerType: z.enum(["CAMPUS", "CLUB"]).default("CAMPUS"), clubId: id.nullable().default(null), category: z.enum(["TECHNICAL", "CULTURAL", "SPORTS", "ACADEMIC", "CAREER", "SOCIAL", "OTHER"]).default("OTHER"), startAt: z.coerce.date(), endAt: z.coerce.date(), location: text, mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).default("OFFLINE"), meetingUrl: url.nullable().default(null), registrationRequired: z.boolean().default(true), capacity: z.coerce.number().int().min(1).max(100000).nullable().default(null), eligibility, status: z.enum(["ACTIVE", "CANCELLED"]).default("ACTIVE") }),
  placements: z.object({ companyName: text, roleTitle: text, opportunityType: z.enum(["INTERNSHIP", "PLACEMENT"]), description: optionalText, compensation: z.string().trim().max(150).default(""), location: text, workMode: z.enum(["ONSITE", "REMOTE", "HYBRID"]).default("ONSITE"), applicationUrl: url, deadlineAt: z.coerce.date(), eligibility: z.object({ departmentIds: ids, years, graduationYears: z.array(z.number().int().min(2020).max(2100)).default([]), minCGPA: z.number().min(0).max(10).nullable().default(null), maxActiveBacklogs: z.number().int().min(0).nullable().default(null) }).default({}), status: z.enum(["ACTIVE", "CLOSED"]).default("ACTIVE") }),
  organization: z.object({ name: text, shortName: z.string().trim().min(2).max(30), allowedEmailDomain: z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/), currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/), timezone: z.string().refine(zone => DateTime.now().setZone(zone).isValid, "Invalid timezone"), supportEmail: z.union([z.email(), z.literal("")]).default(""), studentRegistrationEnabled: z.boolean() }),
};
