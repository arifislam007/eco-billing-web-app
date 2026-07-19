// Wipes all business data (partners, months, entries, deposits, costs,
// transactions) while keeping User accounts intact. Run with `npm run
// clear-data` against whichever DATABASE_URL is active.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const results = {};
  results.transactions = (await prisma.transaction.deleteMany({})).count;
  results.collectionEntries = (await prisma.collectionEntry.deleteMany({})).count;
  results.deposits = (await prisma.deposit.deleteMany({})).count;
  results.costItems = (await prisma.costItem.deleteMany({})).count;
  results.partnerMonthEntries = (await prisma.partnerMonthEntry.deleteMany({})).count;
  results.months = (await prisma.month.deleteMany({})).count;
  results.partners = (await prisma.partner.deleteMany({})).count;

  const remainingUsers = await prisma.user.findMany({ select: { email: true, role: true } });

  console.log("Deleted:", results);
  console.log("Users kept:", remainingUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
