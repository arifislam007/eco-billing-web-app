import { PartnerMonthEntry } from "@prisma/client";
import { prisma } from "./prisma";
import { computeEntry, sumDecimals } from "./calc";

/** Σ CollectionEntry.users / .collection for a partner+month - the "totals" a
 * PartnerMonthEntry no longer stores directly (same pattern as totalDeposit). */
async function collectionTotals(partnerId: string, monthId: string) {
  const rows = await prisma.collectionEntry.findMany({ where: { partnerId, monthId } });
  return {
    totalUsers: rows.reduce((sum, r) => sum + r.users, 0),
    totalCollection: sumDecimals(rows.map((r) => r.collection)),
  };
}

async function collectionTotalsForMonth(monthId: string) {
  const rows = await prisma.collectionEntry.findMany({ where: { monthId } });
  const byPartner = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byPartner.get(r.partnerId) ?? [];
    list.push(r);
    byPartner.set(r.partnerId, list);
  }
  return byPartner;
}

export async function serializeEntry(entry: PartnerMonthEntry) {
  const [deposits, { totalUsers, totalCollection }] = await Promise.all([
    prisma.deposit.findMany({ where: { partnerId: entry.partnerId, monthId: entry.monthId } }),
    collectionTotals(entry.partnerId, entry.monthId),
  ]);
  const totalDeposit = sumDecimals(deposits.map((d) => d.amount));

  const computed = computeEntry({
    totalCollection,
    commissionPct: entry.commissionPct,
    bonusPct: entry.bonusPct,
    discount: entry.discount,
    lastMonthDue: entry.lastMonthDue,
    totalDeposit,
  });

  return {
    ...entry,
    totalUsers,
    totalCollection,
    depositBy15th: totalDeposit,
    totalDeposit,
    ...computed,
  };
}

export async function serializeEntries(entries: PartnerMonthEntry[]) {
  if (!entries.length) return [];
  const monthId = entries[0].monthId;

  const [deposits, collectionByPartner] = await Promise.all([
    prisma.deposit.findMany({ where: { monthId } }),
    collectionTotalsForMonth(monthId),
  ]);
  const depositsByPartner = new Map<string, typeof deposits>();
  for (const d of deposits) {
    const list = depositsByPartner.get(d.partnerId) ?? [];
    list.push(d);
    depositsByPartner.set(d.partnerId, list);
  }

  return entries.map((entry) => {
    const partnerDeposits = depositsByPartner.get(entry.partnerId) ?? [];
    const totalDeposit = sumDecimals(partnerDeposits.map((d) => d.amount));

    const partnerCollections = collectionByPartner.get(entry.partnerId) ?? [];
    const totalUsers = partnerCollections.reduce((sum, r) => sum + r.users, 0);
    const totalCollection = sumDecimals(partnerCollections.map((r) => r.collection));

    const computed = computeEntry({
      totalCollection,
      commissionPct: entry.commissionPct,
      bonusPct: entry.bonusPct,
      discount: entry.discount,
      lastMonthDue: entry.lastMonthDue,
      totalDeposit,
    });
    return {
      ...entry,
      totalUsers,
      totalCollection,
      depositBy15th: totalDeposit,
      totalDeposit,
      ...computed,
    };
  });
}

/** Used by months.ts carry-forward: a partner's totals for a month that may
 * not have a PartnerMonthEntry row backing it yet. */
export { collectionTotals };
