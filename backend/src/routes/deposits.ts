import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (req, res) => {
  const { monthId, partnerId } = req.query as { monthId?: string; partnerId?: string };
  const deposits = await prisma.deposit.findMany({
    where: {
      ...(monthId ? { monthId } : {}),
      ...(partnerId ? { partnerId } : {}),
    },
    include: { partner: true },
    orderBy: { date: "desc" },
  });
  res.json(deposits);
});

const createSchema = z.object({
  partnerId: z.string().min(1),
  monthId: z.string().min(1),
  date: z.string().datetime().optional(),
  amount: z.number().positive(),
  medium: z.enum(["cash", "bkash", "bank"]).default("cash"),
  ref: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, ...rest } = parsed.data;

  const deposit = await prisma.deposit.create({
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });
  res.status(201).json(deposit);
});

router.delete("/:id", async (req, res) => {
  await prisma.deposit.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
