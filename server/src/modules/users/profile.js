import { z } from "zod";
import { toPublicUser } from "./user.utils.js";
const optionalUrl = z.union([z.literal(""), z.string().url().refine(v => /^https?:\/\//.test(v))]).default("");
const tags = z.array(z.string().trim().min(1).max(50)).max(15).default([]);
export async function updateProfile(req, res) {
  const data = z.object({ name: z.string().trim().min(2).max(100), bio: z.string().trim().max(300).default(""), linkedInUrl: optionalUrl, githubUrl: optionalUrl, skills: tags, interests: tags }).parse(req.body);
  req.user.name = data.name;
  req.user.profile = { bio: data.bio, linkedInUrl: data.linkedInUrl, githubUrl: data.githubUrl, skills: [...new Set(data.skills)], interests: [...new Set(data.interests)] };
  await req.user.save();
  res.json({ data: { user: toPublicUser(req.user) } });
}
