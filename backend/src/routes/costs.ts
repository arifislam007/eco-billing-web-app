import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { sumDecimals } from "../calc";
import { serializeEntries } from "../entrySerializer";

const router = Router();

router.get("/", async (req, res) => {
  const monthId = req.query.monthId as string | undefined;
  if (!monthId) return res.status(400).json({ error: "monthId query param required" });

  const items = await prisma.costItem.findMany({ where: { monthId }, orderBy: { label: "asc" } });
  const totalCost = sumDecimals(items.map((i) => i.amount));
  res.json({ items, totalCost });
});

const createSchema = z.object({
  monthId: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().min(0),
  note: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const item = await prisma.costItem.create({ data: parsed.data });
  res.status(201).json(item);
});

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  note: z.string().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const item = await prisma.costItem.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  const item = await prisma.costItem.findUnique({ where: { id: req.params.id } });
  if (item?.isComputedBonus) {
    return res.status(400).json({ error: "The computed Bonus line cannot be deleted directly." });
  }
  await prisma.costItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/** Recompute the auto "Bonus" cost line from the sum of all partners' bonusAmount for the month. */
router.post("/recompute-bonus/:monthId", async (req, res) => {
  const { monthId } = req.params;

  const rawEntries = await prisma.partnerMonthEntry.findMany({ where: { monthId } });
  const serialized = rawEntries.length ? await serializeEntries(rawEntries) : [];
  const totalBonus = sumDecimals(serialized.map((e) => e.bonusAmount));

  const bonusLine = await prisma.costItem.upsert({
    where: {
      id:
        (await prisma.costItem.findFirst({ where: { monthId, isComputedBonus: true } }))?.id ??
        "__none__",
    },
    update: { amount: totalBonus },
    create: { monthId, label: "Bonus", amount: totalBonus, isComputedBonus: true },
  });

  res.json(bonusLine);
});

export default router;
