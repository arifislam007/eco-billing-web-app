-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'admin';
