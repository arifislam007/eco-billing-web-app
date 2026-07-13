import { Router } from "express";
import { prisma } from "../prisma";
import { serializeEntry } from "../entrySerializer";

const router = Router();

/** Voucher data for a single partner in a given month. */
router.get("/:monthId/:partnerId", async (req, res) => {
  const { monthId, partnerId } = req.params;

  const [month, partner, entry] = await Promise.all([
    prisma.month.findUnique({ where: { id: monthId } }),
    prisma.partner.findUnique({ where: { id: partnerId } }),
    prisma.partnerMonthEntry.findUnique({
      where: { partnerId_monthId: { partnerId, monthId } },
    }),
  ]);

  if (!month || !partner) return res.status(404).json({ error: "Month or partner not found" });
  if (!entry) return res.status(404).json({ error: "No entry for this partner in this month" });

  const serialized = await serializeEntry(entry);

  res.json({
    month,
    partner,
    entry: serialized,
    generatedAt: new Date().toISOString(),
  });
});

/** Voucher data for every partner with an entry in the given month, for "print all". */
router.get("/:monthId", async (req, res) => {
  const { monthId } = req.params;

  const month = await prisma.month.findUnique({ where: { id: monthId } });
  if (!month) return res.status(404).json({ error: "Month not found" });

  const entries = await prisma.partnerMonthEntry.findMany({
    where: { monthId },
    include: { partner: true },
    orderBy: { partner: { name: "asc" } },
  });

  const vouchers = await Promise.all(
    entries.map(async (entry) => ({
      month,
      partner: entry.partner,
      entry: await serializeEntry(entry),
      generatedAt: new Date().toISOString(),
    }))
  );

  res.json(vouchers);
});

export default router;
