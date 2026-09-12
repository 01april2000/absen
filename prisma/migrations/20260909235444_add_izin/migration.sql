-- CreateEnum
CREATE TYPE "JenisIzin" AS ENUM ('Izin', 'Sakit');

-- CreateEnum
CREATE TYPE "StatusIzin" AS ENUM ('Menunggu', 'Disetujui', 'Ditolak');

-- CreateTable
CREATE TABLE "Izin" (
    "id" SERIAL NOT NULL,
    "guru_id" INTEGER NOT NULL,
    "jenis" "JenisIzin" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "keterangan" TEXT,
    "status" "StatusIzin" NOT NULL DEFAULT 'Menunggu',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Izin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Izin_guru_id_idx" ON "Izin"("guru_id");

-- AddForeignKey
ALTER TABLE "Izin" ADD CONSTRAINT "Izin_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE CASCADE ON UPDATE CASCADE;
