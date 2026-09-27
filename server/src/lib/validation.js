import { z } from "zod";

export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
export const email = z.string().trim().toLowerCase().email().max(254);
export const password = z.string().min(8).max(128);
export const name = z.string().trim().min(2).max(100);
export const registration = z.object({ name, email, password, accountType: z.enum(["STUDENT", "FACULTY"]) });
export const login = z.object({ email, password: z.string().min(1).max(128) });
export const verification = z.object({ email, code: z.string().regex(/^\d{6}$/, "Enter the six-digit code") });
export const emailOnly = z.object({ email });
export const validate = schema => (req, res, next) => {
  req.validated = schema.parse(req.body);
  next();
};
