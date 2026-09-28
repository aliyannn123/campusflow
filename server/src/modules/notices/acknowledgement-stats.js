export async function acknowledgementStats(record, Model, field) {
  const filter = { [field]: record._id };
  if (record.targetedUserIds != null) filter.userId = { $in: record.targetedUserIds };
  const data = await Model.find(filter).populate("userId", "name").sort({ createdAt: 1 }).lean();
  const targeted = record.targetedRecipientCount ?? null;
  return { data, statistics: { targeted, acknowledged: data.length, pending: targeted == null ? null : Math.max(0, targeted - data.length), rate: targeted == null ? null : targeted === 0 ? 0 : Math.round(data.length / targeted * 1000) / 10 } };
}
