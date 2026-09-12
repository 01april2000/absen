import prisma from "@/lib/prisma";
import { GuruTable } from "@/components/admin/guru-table";

export const metadata = { title: "Data Guru | Aplikasi Absen" };

export default async function GuruPage() {
  const [guru, mapel] = await Promise.all([
    prisma.guru.findMany({
      include: { mapel: { orderBy: { nama_mapel: "asc" } } },
      orderBy: { id: "asc" },
    }),
    prisma.mapel.findMany({ orderBy: { nama_mapel: "asc" } }),
  ]);

  return <GuruTable rows={guru} mapelOptions={mapel} />;
}