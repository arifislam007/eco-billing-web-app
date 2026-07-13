import { Router } from "express";
import { prisma } from "../prisma";
import { computeLedgerBalance, computeMonthTotals, computeProfit, sumDecimals } from "../calc";
import { serializeEntries } from "../entrySerializer";

const router = Router();

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
