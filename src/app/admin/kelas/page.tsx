import prisma from "@/lib/prisma";
import { KelasTable } from "@/components/admin/kelas-table";

export const metadata = { title: "Kelas | Aplikasi Absen" };

export default async function KelasPage() {
  const kelas = await prisma.kelas.findMany({
    include: { _count: { select: { siswa: true, jadwal: true } } },
    orderBy: { nama_kelas: "asc" },
  });

  return <KelasTable rows={kelas} />;
}