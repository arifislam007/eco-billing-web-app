-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "users" INTEGER NOT NULL,
    "collection" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "CollectionEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: preserve every existing PartnerMonthEntry's totalUsers/totalCollection
-- as its first CollectionEntry row, before those columns are dropped below.
-- gen_random_uuid() is built into Postgres core since v13, no extension needed.
INSERT INTO "CollectionEntry" ("id", "partnerId", "monthId", "users", "collection", "note", "createdAt")
SELECT gen_random_uuid()::text, "partnerId", "monthId", "totalUsers", "totalCollection",
       'Migrated from the original single-entry record', "createdAt"
FROM "PartnerMonthEntry"
WHERE "totalUsers" IS NOT NULL AND "totalCollection" IS NOT NULL;

-- AlterTable: totalUsers/totalCollection are now computed as the sum of
-- CollectionEntry rows, same pattern as Deposit -> totalDeposit.
ALTER TABLE "PartnerMonthEntry" DROP COLUMN "totalUsers",
                                 DROP COLUMN "totalCollection";
