import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AbsensiTable } from "@/components/guru/absensi-table";

export const metadata = { title: "Laporan Absensi | Aplikasi Absen" };

export default async function LaporanAbsensiPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const guru = await prisma.guru.findUnique({
    where: { authUserId: session.user.id },
  });
  if (!guru) redirect("/");

  const [absensi, jadwal, siswa] = await Promise.all([
    prisma.absensi.findMany({
      where: { jadwal: { guru_id: guru.id } },
      include: { siswa: true, mapel: true, jadwal: { include: { kelas: true } } },
      orderBy: [{ tanggal: "desc" }, { jam: "desc" }],
    }),
    prisma.jadwal.findMany({
      where: { guru_id: guru.id },
      include: { mapel: true, kelas: true },
    }),
    prisma.siswa.findMany({
      where: { isActive: true },
      select: { id: true, nama: true, nis: true, kelas_id: true },
    }),
  ]);

  const mapelMap = new Map<number, { id: number; nama_mapel: string }>();
  const kelasMap = new Map<number, { id: number; nama_kelas: string }>();
  for (const j of jadwal) {
    if (j.mapel) {
      mapelMap.set(j.mapel.id, { id: j.mapel.id, nama_mapel: j.mapel.nama_mapel });
    }
    if (j.kelas) {
      kelasMap.set(j.kelas.id, { id: j.kelas.id, nama_kelas: j.kelas.nama_kelas });
    }
  }
  const mapelOptions = [...mapelMap.values()];
  const kelasOptions = [...kelasMap.values()];

  const siswaByKelas = new Map<number, { id: number; nama: string; nis: string }[]>();
  for (const s of siswa) {
    if (s.kelas_id == null) continue;
    const list = siswaByKelas.get(s.kelas_id) ?? [];
    list.push({ id: s.id, nama: s.nama, nis: s.nis });
    siswaByKelas.set(s.kelas_id, list);
  }

  return (
    <AbsensiTable
      rows={absensi}
      mapelOptions={mapelOptions}
      kelasOptions={kelasOptions}
      jadwal={jadwal}
      siswaByKelas={siswaByKelas}
    />
  );
}