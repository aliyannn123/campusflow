import { Router } from "express";
import { requireAuth, requireActive } from "../../middleware/auth.js";
import { accessibleSpaces, requireSpace } from "./space.service.js";
import Membership from "./membership.model.js";
const router = Router();
router.use(requireAuth, requireActive);
router.get("/", async (req, res) => res.json({ data: await accessibleSpaces(req.user._id) }));
router.get("/:spaceId", async (req, res) => {
  const { space, membership, canManage } = await requireSpace(req.user._id, req.params.spaceId);
  res.json({ data: { space, roles: membership.roles, canManage } });
});
router.get("/:spaceId/members", async (req, res) => {
  await requireSpace(req.user._id, req.params.spaceId);
  res.json({ data: await Membership.find({ spaceId: req.params.spaceId, status: "ACTIVE" }).populate("userId", "name requestedAccountType").limit(200).lean() });
});
export default router;
