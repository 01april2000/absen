import prisma from "@/lib/prisma";
import { MapelTable } from "@/components/admin/mapel-table";

export const metadata = { title: "Mata Pelajaran | Aplikasi Absen" };

export default async function MapelPage() {
  const mapel = await prisma.mapel.findMany({
    include: { _count: { select: { guru: true } } },
    orderBy: { id: "asc" },
  });

  return <MapelTable rows={mapel} />;
}