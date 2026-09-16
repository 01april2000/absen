import prisma from "@/lib/prisma";
import { TitipTugasTable } from "@/components/admin/titip-tugas-table";

export const metadata = { title: "Titip Tugas | Aplikasi Absen" };

export default async function TitipTugasPage() {
  const rows = await prisma.titipTugas.findMany({
    include: {
      izin: {
        include: {
          titipTugas: { select: { id: true, status: true } },
        },
      },
      guru: { select: { nama: true } },
      kelas: { select: { nama_kelas: true } },
      jadwal: {
        select: {
          hari: true,
          jam_mulai: true,
          jam_selesai: true,
          mapel: { select: { nama_mapel: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <TitipTugasTable rows={rows} />;
}