import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { IzinTable } from "@/components/guru/izin-table";

export const metadata = { title: "Izin/Sakit | Aplikasi Absen" };

export default async function IzinPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const guru = await prisma.guru.findUnique({
    where: { authUserId: session.user.id },
    select: { id: true },
  });
  if (!guru) redirect("/");

  const [izin, jadwal, titipTugas] = await Promise.all([
    prisma.izin.findMany({
      where: { guru_id: guru.id },
      orderBy: { tanggal: "desc" },
    }),
    prisma.jadwal.findMany({
      where: { guru_id: guru.id },
      select: {
        id: true,
        hari: true,
        jam_mulai: true,
        jam_selesai: true,
        mapel: { select: { nama_mapel: true } },
        kelas: { select: { id: true, nama_kelas: true } },
      },
      orderBy: [{ hari: "asc" }, { jam_mulai: "asc" }],
    }),
    prisma.titipTugas.findMany({
      where: { guru_id: guru.id },
      select: {
        id: true,
        izin_id: true,
        kelas_id: true,
        jadwal_id: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const kelasOptions = [
    ...new Map(
      jadwal
        .filter((j) => j.kelas !== null)
        .map((j) => [
          j.kelas!.id,
          { id: j.kelas!.id, nama_kelas: j.kelas!.nama_kelas },
        ])
    ).values(),
  ].sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, "id"));

  return (
    <IzinTable
      rows={izin}
      kelasOptions={kelasOptions}
      jadwalOptions={jadwal}
      titipTugas={titipTugas}
    />
  );
}