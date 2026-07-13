import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";

const router = Router();

const userSelect = { id: true, email: true, role: true, active: true, createdAt: true };

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { email: "asc" } });
  res.json(users);
});

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "staff"]).default("staff"),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "A user with that email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, role },
    select: userSelect,
  });
  res.status(201).json(user);
});

const updateSchema = z.object({
  role: z.enum(["admin", "staff"]).optional(),
  active: z.boolean().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: userSelect,
  });
  res.json(user);
});

export default router;
