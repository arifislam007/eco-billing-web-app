import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { serializeEntries, serializeEntry } from "../entrySerializer";
import { AuthedRequest, requireRole } from "../middleware/auth";

const router = Router();

/**
 * Staff may only see totalUsers/totalCollection (and, via CollectionEntry,
 * add to them) - commission/bonus/discount/dues/deposits are business terms
 * the owner doesn't want data-entry staff to see, not just uneditable.
 */
function restrictForStaff(entry: {
  id: string;
  partnerId: string;
  monthId: string;
  totalUsers: number;
  totalCollection: unknown;
  partner?: unknown;
}) {
  return {
    id: entry.id,
    partnerId: entry.partnerId,
    monthId: entry.monthId,
    totalUsers: entry.totalUsers,
    totalCollection: entry.totalCollection,
    partner: entry.partner,
  };
}

router.get("/", async (req: AuthedRequest, res) => {
  const monthId = req.query.monthId as string | undefined;
  if (!monthId) return res.status(400).json({ error: "monthId query param required" });

  const entries = await prisma.partnerMonthEntry.findMany({
    where: { monthId },
    include: { partner: true },
    orderBy: { partner: { name: "asc" } },
  });
  const serialized = entries.length ? await serializeEntries(entries) : [];

  if (req.role === "staff") {
    return res.json(serialized.map(restrictForStaff));
  }
  res.json(serialized);
});

// Admin-only: the parameters here (commission %, bonus %, discount, last
// month due) are never touched by staff, on the UI or via a raw API call.
// totalUsers/totalCollection live on CollectionEntry now - see
// routes/collectionEntries.ts for the add/edit/delete of those.
const upsertSchema = z.object({
  partnerId: z.string().min(1),
  monthId: z.string().min(1),
  commissionPct: z.number().min(0).max(1).default(0.45),
  bonusPct: z.number().min(0).max(1).default(0),
  discount: z.number().min(0).default(0).transform(Math.round),
  lastMonthDue: z.number().default(0).transform(Math.round),
});

router.post("/", requireRole("admin"), async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const entry = await prisma.partnerMonthEntry.upsert({
    where: { partnerId_monthId: { partnerId: data.partnerId, monthId: data.monthId } },
    update: {
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
  commissionPct: z.number().min(0).max(1).optional(),
  bonusPct: z.number().min(0).max(1).optional(),
  discount: z.number().min(0).transform(Math.round).optional(),
  lastMonthDue: z.number().transform(Math.round).optional(),
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const entry = await prisma.partnerMonthEntry.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(await serializeEntry(entry));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  await prisma.partnerMonthEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
