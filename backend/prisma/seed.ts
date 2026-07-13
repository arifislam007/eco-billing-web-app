import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeEntry, computeMonthTotals, computeProfit, sumDecimals } from "../src/calc";

const prisma = new PrismaClient();

const PARTNERS: Array<{
  name: string;
  users: number;
  collection: number;
  commissionPct: number;
  bonusPct: number;
}> = [
  { name: "Jahid Bhai", users: 165, collection: 81900, commissionPct: 0.45, bonusPct: 0.02 },
  { name: "Helal Bhai", users: 311, collection: 151150, commissionPct: 0.45, bonusPct: 0.02 },
  { name: "Alamgir Bhai", users: 477, collection: 239300, commissionPct: 0.45, bonusPct: 0.1 },
  { name: "Badsha bhai", users: 169, collection: 70300, commissionPct: 0.45, bonusPct: 0.05 },
  { name: "Bilal Bhai", users: 295, collection: 138980, commissionPct: 0.45, bonusPct: 0.03 },
  { name: "Liton Bhai", users: 220, collection: 110200, commissionPct: 0.45, bonusPct: 0.03 },
  { name: "Mortuza Bhai", users: 127, collection: 60300, commissionPct: 0.45, bonusPct: 0.03 },
  { name: "Murad Bhai", users: 141, collection: 43400, commissionPct: 0.45, bonusPct: 0.03 },
  { name: "Aslam Bhai", users: 231, collection: 102450, commissionPct: 0.45, bonusPct: 0.05 },
  { name: "Hridoy", users: 12, collection: 4200, commissionPct: 0.45, bonusPct: 0.03 },
  { name: "Asraf", users: 282, collection: 126900, commissionPct: 0.45, bonusPct: 0 },
  { name: "Shaon", users: 21, collection: 8000, commissionPct: 0.45, bonusPct: 0 },
  { name: "Mitul Bhai", users: 272, collection: 131400, commissionPct: 1.0, bonusPct: 0 },
];

const COST_ITEMS: Array<{ label: string; amount: number }> = [
  { label: "ISP Bill", amount: 409161 },
  { label: "Softifybd", amount: 6800 },
  { label: "bidyut dada + Robin", amount: 12000 },
  { label: "Electricity Bill", amount: 7492 },
];

async function main() {
  console.log("Seeding admin user...");
  const adminPasswordHash = await bcrypt.hash("changeme123", 10);
  await prisma.user.upsert({
    where: { email: "admin@econet.local" },
    update: {},
    create: { email: "admin@econet.local", passwordHash: adminPasswordHash, role: "admin" },
  });

  console.log("Seeding demo staff user (Monthly Entry + Vouchers only)...");
  const staffPasswordHash = await bcrypt.hash("changeme123", 10);
  await prisma.user.upsert({
    where: { email: "staff@econet.local" },
    update: {},
    create: { email: "staff@econet.local", passwordHash: staffPasswordHash, role: "staff" },
  });

  console.log("Seeding month July-26...");
  const month = await prisma.month.upsert({
    where: { label: "July-26" },
    update: {},
    create: { label: "July-26", year: 2026, month: 7, status: "open" },
  });

  const entries: Array<{
    name: string;
    users: number;
    collection: number;
    commissionPct: number;
    bonusPct: number;
    computed: ReturnType<typeof computeEntry>;
  }> = [];

  for (const p of PARTNERS) {
    const partner = await prisma.partner.upsert({
      where: { name: p.name },
      update: {},
      create: { name: p.name },
    });

    const computed = computeEntry({
      totalCollection: p.collection,
      commissionPct: p.commissionPct,
      bonusPct: p.bonusPct,
      discount: 0,
      lastMonthDue: 0,
      totalDeposit: 0,
    });

    await prisma.partnerMonthEntry.upsert({
      where: { partnerId_monthId: { partnerId: partner.id, monthId: month.id } },
      update: {},
      create: {
        partnerId: partner.id,
        monthId: month.id,
        totalUsers: p.users,
        totalCollection: p.collection,
        commissionPct: p.commissionPct,
        bonusPct: p.bonusPct,
        discount: 0,
        lastMonthDue: 0,
      },
    });

    entries.push({ ...p, computed });
  }

  const totalBonus = sumDecimals(entries.map((e) => e.computed.bonusAmount));

  console.log("Seeding cost items...");
  for (const c of COST_ITEMS) {
    await prisma.costItem.deleteMany({ where: { monthId: month.id, label: c.label } });
    await prisma.costItem.create({
      data: { monthId: month.id, label: c.label, amount: c.amount },
    });
  }
  await prisma.costItem.deleteMany({ where: { monthId: month.id, isComputedBonus: true } });
  await prisma.costItem.create({
    data: {
      monthId: month.id,
      label: "Bonus",
      amount: totalBonus,
      isComputedBonus: true,
    },
  });

  const totals = computeMonthTotals(
    entries.map((e) => ({
      totalUsers: e.users,
      totalCollection: e.collection,
      commissionPct: e.commissionPct,
      bonusPct: e.bonusPct,
      computed: e.computed,
      totalDeposit: 0,
    }))
  );

  const totalCost = sumDecimals(COST_ITEMS.map((c) => c.amount)).add(totalBonus);
  const profit = computeProfit(totals.totalBusinessAmount, totalCost);

  console.log("\n=== July-26 Totals ===");
  console.log("Total Users:", totals.totalUsers, "(expected 2723)");
  console.log("Total Collection:", totals.totalCollection.toString(), "(expected 1268480)");
  console.log("Total Business Amount:", totals.totalBusinessAmount.toString(), "(expected 625394)");
  console.log("Total Bonus (cost line):", totalBonus.toString());
  console.log("Total Cost:", totalCost.toString());
  console.log("Profit:", profit.toString());

  const bilal = entries.find((e) => e.name === "Bilal Bhai")!;
  console.log("\n=== Bilal Bhai check ===");
  console.log("commissionAmount:", bilal.computed.commissionAmount.toString(), "(expected 62541)");
  console.log("businessAmount:", bilal.computed.businessAmount.toString(), "(expected 76439)");
  console.log("bonusAmount:", bilal.computed.bonusAmount.toString(), "(expected ~2293.17)");
  console.log("dueWithBonus:", bilal.computed.dueWithBonus.toString(), "(expected 76439)");
  console.log("dueAfterBonus:", bilal.computed.dueAfterBonus.toString(), "(expected ~74145.83)");

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
