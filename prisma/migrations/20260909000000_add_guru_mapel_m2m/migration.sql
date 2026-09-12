-- DropForeignKey
ALTER TABLE "Guru" DROP CONSTRAINT "Guru_mapel_id_fkey";

-- CreateTable
CREATE TABLE "_GuruToMapel" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GuruToMapel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GuruToMapel_B_index" ON "_GuruToMapel"("B");

-- AddForeignKey
ALTER TABLE "_GuruToMapel" ADD CONSTRAINT "_GuruToMapel_A_fkey" FOREIGN KEY ("A") REFERENCES "Guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuruToMapel" ADD CONSTRAINT "_GuruToMapel_B_fkey" FOREIGN KEY ("B") REFERENCES "Mapel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: pindahkan data mapel_id lama ke relasi many-to-many
INSERT INTO "_GuruToMapel" ("A", "B")
SELECT "id", "mapel_id" FROM "Guru" WHERE "mapel_id" IS NOT NULL;

-- DropIndex
DROP INDEX "Guru_mapel_id_idx";

-- AlterTable
ALTER TABLE "Guru" DROP COLUMN "mapel_id";