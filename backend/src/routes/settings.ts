import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireRole } from "../middleware/auth";

const router = Router();

async function getOrCreateSettings() {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

// Both roles can read - staff needs this to know whether Monthly Report is
// available to them at all (nav + the page's own access check).
router.get("/", async (_req, res) => {
  res.json(await getOrCreateSettings());
});

const updateSchema = z.object({
  allowStaffMonthlyReport: z.boolean().optional(),
});

router.patch("/", requireRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await getOrCreateSettings();
  const settings = await prisma.appSettings.update({
    where: { id: "singleton" },
    data: parsed.data,
  });
  res.json(settings);
});

export default router;
