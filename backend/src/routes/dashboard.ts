import { Router } from "express";
import { prisma } from "../prisma";
import { computeLedgerBalance, computeMonthTotals, computeProfit, sumDecimals } from "../calc";
import { serializeEntries } from "../entrySerializer";

const router = Router();

/** Per-month totals across every month, chronological, plus the same broken
 * down per-partner - powers the growth charts on the Dashboard (overall and
 * per-partner). Must be registered before "/:monthId" or Express would
 * match "trends" as a monthId. */
router.get("/trends", async (_req, res) => {
  const [months, partners] = await Promise.all([
    prisma.month.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.partner.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const perMonth = await Promise.all(
    months.map(async (month) => {
      const [rawEntries, costItems] = await Promise.all([
        prisma.partnerMonthEntry.findMany({ where: { monthId: month.id } }),
        prisma.costItem.findMany({ where: { monthId: month.id } }),
      ]);
      const entries = rawEntries.length ? await serializeEntries(rawEntries) : [];
      return { month, entries, costItems };
    })
  );

  const overall = perMonth.map(({ month, entries, costItems }) => ({
    monthId: month.id,
    label: month.label,
    totalUsers: entries.reduce((sum, e) => sum + e.totalUsers, 0),
    totalCollection: sumDecimals(entries.map((e) => e.totalCollection)),
    totalCost: sumDecimals(costItems.map((c) => c.amount)),
  }));

  const byPartner = partners.map((partner) => ({
    partnerId: partner.id,
    partnerName: partner.name,
    series: perMonth.map(({ month, entries }) => {
      const entry = entries.find((e) => e.partnerId === partner.id);
      return {
        monthId: month.id,
        label: month.label,
        totalUsers: entry?.totalUsers ?? 0,
        totalCollection: entry?.totalCollection ?? "0",
      };
    }),
  }));

  res.json({ overall, byPartner });
});

router.get("/:monthId", async (req, res) => {
  const { monthId } = req.params;

  const [rawEntries, costItems, transactions] = await Promise.all([
    prisma.partnerMonthEntry.findMany({ where: { monthId }, include: { partner: true } }),
    prisma.costItem.findMany({ where: { monthId } }),
    prisma.transaction.findMany({ where: { monthId } }),
  ]);

  const entries = rawEntries.length ? await serializeEntries(rawEntries) : [];

  const totals = computeMonthTotals(
    entries.map((e) => ({
      totalUsers: e.totalUsers,
      totalCollection: e.totalCollection,
      commissionPct: e.commissionPct,
      bonusPct: e.bonusPct,
      computed: {
        commissionAmount: e.commissionAmount,
        businessAmount: e.businessAmount,
        bonusAmount: e.bonusAmount,
        dueWithBonus: e.dueWithBonus,
        dueAfterBonus: e.dueAfterBonus,
      },
      totalDeposit: e.totalDeposit,
    }))
  );

  const totalCost = sumDecimals(costItems.map((c) => c.amount));
  const profit = computeProfit(totals.totalBusinessAmount, totalCost);
  const ledgerBalance = computeLedgerBalance(transactions);

  res.json({
    monthId,
    totals,
    costs: { items: costItems, totalCost },
    profit,
    ledgerBalance,
  });
});

export default router;
