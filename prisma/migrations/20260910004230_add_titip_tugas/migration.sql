-- CreateEnum
CREATE TYPE "StatusTitipTugas" AS ENUM ('Menunggu', 'Disetujui', 'Ditolak');

-- CreateTable
CREATE TABLE "TitipTugas" (
    "id" SERIAL NOT NULL,
    "izin_id" INTEGER NOT NULL,
    "guru_id" INTEGER NOT NULL,
    "kelas_id" INTEGER NOT NULL,
    "jadwal_id" INTEGER NOT NULL,
    "konten" TEXT NOT NULL,
    "status" "StatusTitipTugas" NOT NULL DEFAULT 'Menunggu',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitipTugas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitipTugas_izin_id_idx" ON "TitipTugas"("izin_id");

-- CreateIndex
CREATE INDEX "TitipTugas_guru_id_idx" ON "TitipTugas"("guru_id");

-- CreateIndex
CREATE INDEX "TitipTugas_kelas_id_idx" ON "TitipTugas"("kelas_id");

-- CreateIndex
CREATE INDEX "TitipTugas_jadwal_id_idx" ON "TitipTugas"("jadwal_id");

-- AddForeignKey
ALTER TABLE "TitipTugas" ADD CONSTRAINT "TitipTugas_izin_id_fkey" FOREIGN KEY ("izin_id") REFERENCES "Izin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitipTugas" ADD CONSTRAINT "TitipTugas_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitipTugas" ADD CONSTRAINT "TitipTugas_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitipTugas" ADD CONSTRAINT "TitipTugas_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "Jadwal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
