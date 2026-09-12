import prisma from "@/lib/prisma";
import { JadwalTable } from "@/components/admin/jadwal-table";

export const metadata = { title: "Jadwal | Aplikasi Absen" };

export default async function JadwalPage() {
  const [jadwal, mapel, guru, kelas] = await Promise.all([
    prisma.jadwal.findMany({
      include: { mapel: true, guru: true, kelas: true },
      orderBy: [{ hari: "asc" }, { jam_mulai: "asc" }],
    }),
    prisma.mapel.findMany({ orderBy: { nama_mapel: "asc" } }),
    prisma.guru.findMany({ orderBy: { nama: "asc" } }),
    prisma.kelas.findMany({ orderBy: { nama_kelas: "asc" } }),
  ]);

  return (
    <JadwalTable
      rows={jadwal}
      mapelOptions={mapel}
      guruOptions={guru}
      kelasOptions={kelas}
    />
  );
}