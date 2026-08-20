-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "allowStaffMonthlyReport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
