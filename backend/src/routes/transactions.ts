import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { computeLedgerBalance, round2 } from "../calc";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();

router.get("/", async (req, res) => {
  const monthId = req.query.monthId as string | undefined;
  const transactions = await prisma.transaction.findMany({
    where: monthId ? { monthId } : undefined,
    orderBy: { date: "asc" },
  });

  let running = new Decimal(0);
  const withBalance = transactions.map((t) => {
    running = round2(running.add(t.receive).sub(t.send));
    return { ...t, runningBalance: running };
  });

  res.json({ transactions: withBalance, balance: computeLedgerBalance(transactions) });
});

const createSchema = z.object({
  monthId: z.string().optional(),
  date: z.string().datetime().optional(),
  details: z.string().min(1),
  send: z.number().min(0).default(0),
  receive: z.number().min(0).default(0),
  comment: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, ...rest } = parsed.data;

  const tx = await prisma.transaction.create({
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });
  res.status(201).json(tx);
});

router.delete("/:id", async (req, res) => {
  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
