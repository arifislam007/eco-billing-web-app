import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  const { monthId, partnerId } = req.query as { monthId?: string; partnerId?: string };
  if (!monthId) return res.status(400).json({ error: "monthId query param required" });

  const entries = await prisma.collectionEntry.findMany({
    where: { monthId, ...(partnerId ? { partnerId } : {}) },
    include: { createdBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(entries);
});

const createSchema = z.object({
  partnerId: z.string().min(1),
  monthId: z.string().min(1),
  users: z.number().int().min(0),
  collection: z.number().min(0).transform(Math.round),
  note: z.string().optional(),
});

// Both admin and staff can add - this is the "input multiple times" path.
// Ensure a PartnerMonthEntry row exists (with default admin params) so the
// rest of the app (commission %, bonus %, discount, last month due) has
// somewhere to live once this partner has any collection activity this month.
router.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { partnerId, monthId, users, collection, note } = parsed.data;

  await prisma.partnerMonthEntry.upsert({
    where: { partnerId_monthId: { partnerId, monthId } },
    update: {},
    create: { partnerId, monthId },
  });

  const entry = await prisma.collectionEntry.create({
    data: { partnerId, monthId, users, collection, note, createdByUserId: req.userId },
  });
  res.status(201).json(entry);
});

const updateSchema = z.object({
  users: z.number().int().min(0).optional(),
  collection: z.number().min(0).transform(Math.round).optional(),
  note: z.string().optional(),
});

// Editing/deleting an already-submitted entry is a correction, not an
// "input" - admin only.
router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const entry = await prisma.collectionEntry.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(entry);
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  await prisma.collectionEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
