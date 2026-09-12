-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Guru');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'Guru';
