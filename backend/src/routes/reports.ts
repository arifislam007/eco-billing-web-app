import { Router, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { serializeEntries } from "../entrySerializer";
import { AuthedRequest } from "../middleware/auth";

const router = Router();

/** Admin always gets in; staff only if the admin-controlled toggle is on.
 * Unlike the static requireRole("admin"), this is a per-request DB check
 * since the toggle can change at any time. */
async function requireReportAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.role === "admin") return next();

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (settings?.allowStaffMonthlyReport) return next();

  return res.status(403).json({ error: "The Monthly Report isn't enabled for your account yet." });
}

router.get("/monthly", requireReportAccess, async (req, res) => {
  const monthId = req.query.monthId as string | undefined;
  if (!monthId) return res.status(400).json({ error: "monthId query param required" });

  const rawEntries = await prisma.partnerMonthEntry.findMany({
    where: { monthId },
    include: { partner: true },
    orderBy: { partner: { name: "asc" } },
  });
  const partnerById = new Map(rawEntries.map((e) => [e.partnerId, e.partner]));
  const entries = rawEntries.length ? await serializeEntries(rawEntries) : [];

  // Full report shape regardless of caller's role - this endpoint's own
  // gate above (admin, or staff with the toggle on) is the security
  // boundary, not the field-stripping GET /api/entries applies for staff.
  res.json(
    entries.map((e) => ({
      id: e.id,
      partnerId: e.partnerId,
      partner: partnerById.get(e.partnerId),
      totalUsers: e.totalUsers,
      totalCollection: e.totalCollection,
      businessAmount: e.businessAmount,
      totalDeposit: e.totalDeposit,
      dueAfterBonus: e.dueAfterBonus,
    }))
  );
});

export default router;
