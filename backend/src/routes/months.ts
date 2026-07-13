import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { computeEntry, sumDecimals } from "../calc";
import { collectionTotals } from "../entrySerializer";
import { requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const months = await prisma.month.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] });
  res.json(months);
});

router.get("/:id", async (req, res) => {
  const month = await prisma.month.findUnique({ where: { id: req.params.id } });
  if (!month) return res.status(404).json({ error: "Month not found" });
  res.json(month);
});

const createSchema = z.object({
  label: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  carryForwardFrom: z.string().optional(), // monthId to carry dueAfterBonus from
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { label, year, month, carryForwardFrom } = parsed.data;

  const newMonth = await prisma.month.create({ data: { label, year, month } });

  if (carryForwardFrom) {
    const prevEntries = await prisma.partnerMonthEntry.findMany({
      where: { monthId: carryForwardFrom },
    });
    const prevMonthDeposits = await prisma.deposit.findMany({ where: { monthId: carryForwardFrom } });

    for (const entry of prevEntries) {
      const depositSum = sumDecimals(
        prevMonthDeposits.filter((d) => d.partnerId === entry.partnerId).map((d) => d.amount)
      );
      const { totalCollection } = await collectionTotals(entry.partnerId, entry.monthId);
      const computed = computeEntry({
        totalCollection,
        commissionPct: entry.commissionPct,
        bonusPct: entry.bonusPct,
        discount: entry.discount,
        lastMonthDue: entry.lastMonthDue,
        totalDeposit: depositSum,
      });

      // New month starts with no CollectionEntry rows yet (totalUsers/
      // totalCollection are 0 until staff/admin submits some) - only the
      // admin-set params and the carried-forward due amount transfer over.
      await prisma.partnerMonthEntry.create({
        data: {
          partnerId: entry.partnerId,
          monthId: newMonth.id,
          commissionPct: entry.commissionPct,
          bonusPct: entry.bonusPct,
          discount: 0,
          lastMonthDue: computed.dueAfterBonus,
        },
      });
    }
  }

  res.status(201).json(newMonth);
});

const updateSchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const month = await prisma.month.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(month);
});

export default router;
