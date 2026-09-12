-- AlterTable
ALTER TABLE "Absensi" ADD COLUMN     "device_id" INTEGER,
ADD COLUMN     "event_id" TEXT;

-- AlterTable
ALTER TABLE "Siswa" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "location" TEXT,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_apiKey_key" ON "Device"("apiKey");

-- CreateIndex
CREATE INDEX "Device_apiKey_idx" ON "Device"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_event_id_key" ON "Absensi"("event_id");

-- CreateIndex
CREATE INDEX "Absensi_device_id_idx" ON "Absensi"("device_id");

-- CreateIndex
CREATE INDEX "Absensi_tanggal_idx" ON "Absensi"("tanggal");

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

