import { z } from "zod";
import { id } from "./validation.js";
export function listFilter(query, fields) {
  const filter = {};
  if (query.q) {
    const q = z.string().trim().max(100).parse(query.q);
    const literal = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = fields.map(field => ({ [field]: { $regex: literal, $options: "i" } }));
  }
  if (query.ids) filter._id = { $in: z.array(id).max(100).parse(String(query.ids).split(",")) };
  return filter;
}
export async function paginate(Model, filter, query, { populate, map = value => value } = {}) {
  const page = z.coerce.number().int().min(1).max(100000).parse(query.page || 1);
  const limit = z.coerce.number().int().min(1).max(200).parse(query.limit || 25);
  let records = Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  if (populate) records = records.populate(populate);
  const [data, total] = await Promise.all([records, Model.countDocuments(filter)]);
  return { data: data.map(map), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}
