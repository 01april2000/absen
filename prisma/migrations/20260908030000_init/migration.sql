-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Hari" AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('Hadir', 'Terlambat', 'Alpha');

-- CreateTable
CREATE TABLE "Mapel" (
    "id" SERIAL NOT NULL,
    "nama_mapel" TEXT NOT NULL,
    "kode_mapel" TEXT NOT NULL,

    CONSTRAINT "Mapel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guru" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mapel_id" INTEGER,
    "password" TEXT NOT NULL,

    CONSTRAINT "Guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" SERIAL NOT NULL,
    "mapel_id" INTEGER,
    "guru_id" INTEGER,
    "hari" "Hari",
    "jam_mulai" TEXT,
    "jam_selesai" TEXT,

    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" SERIAL NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "rfid_uid" TEXT,
    "kelas_id" INTEGER,

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER,
    "mapel_id" INTEGER,
    "jadwal_id" INTEGER,
    "tanggal" TIMESTAMP(3),
    "jam" TEXT,
    "status" "StatusAbsensi",

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guru_username_key" ON "Guru"("username");

-- CreateIndex
CREATE INDEX "Guru_mapel_id_idx" ON "Guru"("mapel_id");

-- CreateIndex
CREATE INDEX "Jadwal_mapel_id_idx" ON "Jadwal"("mapel_id");

-- CreateIndex
CREATE INDEX "Jadwal_guru_id_idx" ON "Jadwal"("guru_id");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_nis_key" ON "Siswa"("nis");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_rfid_uid_key" ON "Siswa"("rfid_uid");

-- CreateIndex
CREATE INDEX "Absensi_siswa_id_idx" ON "Absensi"("siswa_id");

-- CreateIndex
CREATE INDEX "Absensi_mapel_id_idx" ON "Absensi"("mapel_id");

-- CreateIndex
CREATE INDEX "Absensi_jadwal_id_idx" ON "Absensi"("jadwal_id");

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_guru_id_fkey" FOREIGN KEY ("guru_id") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "Mapel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "Jadwal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

