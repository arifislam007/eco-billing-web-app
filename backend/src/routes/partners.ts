import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  const activeOnly = req.query.active === "true";
  const partners = await prisma.partner.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
  res.json(partners);
});

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const partner = await prisma.partner.create({ data: parsed.data });
  res.status(201).json(partner);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const partner = await prisma.partner.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(partner);
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  await prisma.partner.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).send();
});

export default router;
