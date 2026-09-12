import prisma from "@/lib/prisma";
import { DeviceTable } from "@/components/admin/device-table";

export const metadata = { title: "Device | Aplikasi Absen" };

export default async function DevicePage() {
  const devices = await prisma.device.findMany({
    orderBy: { id: "asc" },
  });

  return <DeviceTable rows={devices} />;
}