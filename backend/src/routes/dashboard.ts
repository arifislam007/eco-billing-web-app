import { Router } from "express";
import { prisma } from "../prisma";
import { computeLedgerBalance, computeMonthTotals, computeProfit, sumDecimals } from "../calc";
import { serializeEntries } from "../entrySerializer";

const router = Router();

/** Per-month totals across every month, chronological - powers the growth
 * charts (users, revenue, cost) on the Dashboard. Must be registered before
 * "/:monthId" or Express would match "trends" as a monthId. */
router.get("/trends", async (_req, res) => {
  const months = await prisma.month.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });

  const results = await Promise.all(
    months.map(async (month) => {
      const [rawEntries, costItems] = await Promise.all([
        prisma.partnerMonthEntry.findMany({ where: { monthId: month.id } }),
        prisma.costItem.findMany({ where: { monthId: month.id } }),
      ]);
      const entries = rawEntries.length ? await serializeEntries(rawEntries) : [];

      return {
        monthId: month.id,
        label: month.label,
        totalUsers: entries.reduce((sum, e) => sum + e.totalUsers, 0),
        totalCollection: sumDecimals(entries.map((e) => e.totalCollection)),
        totalCost: sumDecimals(costItems.map((c) => c.amount)),
      };
    })
  );

  res.json(results);
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
