import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { serializeEntries, serializeEntry } from "../entrySerializer";

const router = Router();

router.get("/", async (req, res) => {
  const monthId = req.query.monthId as string | undefined;
  if (!monthId) return res.status(400).json({ error: "monthId query param required" });

  const entries = await prisma.partnerMonthEntry.findMany({
    where: { monthId },
    include: { partner: true },
    orderBy: { partner: { name: "asc" } },
  });
  res.json(entries.length ? await serializeEntries(entries) : []);
});

const upsertSchema = z.object({
  partnerId: z.string().min(1),
  monthId: z.string().min(1),
  totalUsers: z.number().int().min(0),
  totalCollection: z.number().min(0),
  commissionPct: z.number().min(0).max(1).default(0.45),
  bonusPct: z.number().min(0).max(1).default(0),
  discount: z.number().min(0).default(0),
  lastMonthDue: z.number().default(0),
});

router.post("/", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const entry = await prisma.partnerMonthEntry.upsert({
    where: { partnerId_monthId: { partnerId: data.partnerId, monthId: data.monthId } },
    update: {
      totalUsers: data.totalUsers,
      totalCollection: data.totalCollection,
      commissionPct: data.commissionPct,
      bonusPct: data.bonusPct,
      discount: data.discount,
      lastMonthDue: data.lastMonthDue,
    },
    create: data,
  });

  res.status(201).json(await serializeEntry(entry));
});

const patchSchema = z.object({
  totalUsers: z.number().int().min(0).optional(),
  totalCollection: z.number().min(0).optional(),
  commissionPct: z.number().min(0).max(1).optional(),
  bonusPct: z.number().min(0).max(1).optional(),
  discount: z.number().min(0).optional(),
  lastMonthDue: z.number().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const entry = await prisma.partnerMonthEntry.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(await serializeEntry(entry));
});

router.delete("/:id", async (req, res) => {
  await prisma.partnerMonthEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
