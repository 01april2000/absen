-- AlterTable
ALTER TABLE "Jadwal" ADD COLUMN     "kelas_id" INTEGER;

-- CreateTable
CREATE TABLE "Kelas" (
    "id" SERIAL NOT NULL,
    "nama_kelas" TEXT NOT NULL,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Jadwal_kelas_id_idx" ON "Jadwal"("kelas_id");

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
