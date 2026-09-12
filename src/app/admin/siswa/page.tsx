import prisma from "@/lib/prisma";
import { SiswaTable } from "@/components/admin/siswa-table";

export const metadata = { title: "Data Siswa | Aplikasi Absen" };

export default async function SiswaPage() {
  const [siswa, kelas] = await Promise.all([
    prisma.siswa.findMany({
      include: { kelas: true },
      orderBy: { id: "asc" },
    }),
    prisma.kelas.findMany({ orderBy: { nama_kelas: "asc" } }),
  ]);

  return <SiswaTable rows={siswa} kelasOptions={kelas} />;
}