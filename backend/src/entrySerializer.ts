import { PartnerMonthEntry } from "@prisma/client";
import { prisma } from "./prisma";
import { computeEntry, sumDecimals } from "./calc";

export async function serializeEntry(entry: PartnerMonthEntry) {
  const deposits = await prisma.deposit.findMany({
    where: { partnerId: entry.partnerId, monthId: entry.monthId },
  });
  const totalDeposit = sumDecimals(deposits.map((d) => d.amount));

  const computed = computeEntry({
    totalCollection: entry.totalCollection,
    commissionPct: entry.commissionPct,
    bonusPct: entry.bonusPct,
    discount: entry.discount,
    lastMonthDue: entry.lastMonthDue,
    totalDeposit,
  });

  return {
    ...entry,
    depositBy15th: totalDeposit,
    totalDeposit,
    ...computed,
  };
}

export async function serializeEntries(entries: PartnerMonthEntry[]) {
  const deposits = await prisma.deposit.findMany({
    where: { monthId: entries[0]?.monthId },
  });
  const depositsByPartner = new Map<string, typeof deposits>();
  for (const d of deposits) {
    const list = depositsByPartner.get(d.partnerId) ?? [];
    list.push(d);
    depositsByPartner.set(d.partnerId, list);
  }

  return entries.map((entry) => {
    const partnerDeposits = depositsByPartner.get(entry.partnerId) ?? [];
    const totalDeposit = sumDecimals(partnerDeposits.map((d) => d.amount));
    const computed = computeEntry({
      totalCollection: entry.totalCollection,
      commissionPct: entry.commissionPct,
      bonusPct: entry.bonusPct,
      discount: entry.discount,
      lastMonthDue: entry.lastMonthDue,
      totalDeposit,
    });
    return {
      ...entry,
      depositBy15th: totalDeposit,
      totalDeposit,
      ...computed,
    };
  });
}
