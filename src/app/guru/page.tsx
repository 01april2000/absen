import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock4,
  Stethoscope,
  Users,
  XCircle,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const metadata = { title: "Dashboard Guru | Aplikasi Absen" };

const HARI_INDEX = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default async function GuruDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const guru = await prisma.guru.findUnique({
    where: { authUserId: session.user.id },
    include: { mapel: true },
  });
  if (!guru) redirect("/");

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const todayHari = HARI_INDEX[today.getDay()];

  const gaji = prisma.jadwal.count({ where: { guru_id: guru.id } });

  const [totalJadwal, jadwalHariIni, izinMenunggu] = await Promise.all([
    gaji,
    prisma.jadwal.findMany({
      where: { guru_id: guru.id, hari: todayHari },
      include: { mapel: true, kelas: true },
      orderBy: { jam_mulai: "asc" },
    }),
    prisma.izin.count({
      where: { guru_id: guru.id, status: "Menunggu" },
    }),
  ]);

  const kelasIds = [
    ...new Set(
      (
        await prisma.jadwal.findMany({
          where: { guru_id: guru.id },
          select: { kelas_id: true },
        })
      )
        .map((j) => j.kelas_id)
        .filter((id): id is number => id !== null)
    ),
  ];

  const [totalSiswa, absensiHariIni, hadir, terlambat, alpha, izinTerbaru] =
    await Promise.all([
      prisma.siswa.count({
        where: kelasIds.length > 0 ? { kelas_id: { in: kelasIds } } : undefined,
      }),
      prisma.absensi.findMany({
        where: {
          jadwal: { guru_id: guru.id },
          tanggal: { gte: today, lt: tomorrow },
        },
        include: { siswa: true, mapel: true },
        orderBy: { jam: "desc" },
        take: 8,
      }),
      prisma.absensi.count({
        where: {
          jadwal: { guru_id: guru.id },
          tanggal: { gte: today, lt: tomorrow },
          status: "Hadir",
        },
      }),
      prisma.absensi.count({
        where: {
          jadwal: { guru_id: guru.id },
          tanggal: { gte: today, lt: tomorrow },
          status: "Terlambat",
        },
      }),
      prisma.absensi.count({
        where: {
          jadwal: { guru_id: guru.id },
          tanggal: { gte: today, lt: tomorrow },
          status: "Alpha",
        },
      }),
      prisma.izin.findMany({
        where: { guru_id: guru.id },
        orderBy: { tanggal: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Jadwal Mengajar", value: totalJadwal, icon: CalendarDays },
    { label: "Jadwal Hari Ini", value: jadwalHariIni.length, icon: Clock4 },
    { label: "Siswa Diajar", value: totalSiswa, icon: Users },
    { label: "Izin Menunggu", value: izinMenunggu, icon: Stethoscope },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Selamat datang, {guru.nama}</h1>
        <p className="text-sm text-muted-foreground">
          {guru.mapel.length ? guru.mapel.map((m) => m.nama_mapel).join(", ") : "-"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border bg-card p-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-heading font-medium">Jadwal Hari Ini</h2>
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {jadwalHariIni.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada jadwal mengajar hari ini
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {jadwalHariIni.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {j.mapel?.nama_mapel ?? "-"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {j.kelas?.nama_kelas ?? "-"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {j.jam_mulai ?? "-"} – {j.jam_selesai ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-heading font-medium">Rekap Absensi Hari Ini</h2>
            <p className="text-sm text-muted-foreground">Berdasarkan jadwal Anda</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Hadir</p>
                <p className="text-lg font-semibold tabular-nums">{hadir}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Clock4 className="size-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Terlambat</p>
                <p className="text-lg font-semibold tabular-nums">{terlambat}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <XCircle className="size-4 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-medium">Alpha</p>
                <p className="text-lg font-semibold tabular-nums">{alpha}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-heading font-medium">Absensi Hari Ini</h2>
            <p className="text-sm text-muted-foreground">Data terbaru dari jadwal Anda</p>
          </div>
          {absensiHariIni.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada data absensi hari ini
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {absensiHariIni.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {a.siswa?.nama?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.siswa?.nama ?? "-"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.mapel?.nama_mapel ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">{a.jam}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        a.status === "Hadir" &&
                          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        a.status === "Terlambat" &&
                          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        a.status === "Alpha" &&
                          "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {a.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-heading font-medium">Izin/Sakit Terbaru</h2>
            <p className="text-sm text-muted-foreground">Riwayat izin Anda</p>
          </div>
          {izinTerbaru.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada catatan izin/sakit
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {izinTerbaru.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.jenis}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.tanggal.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      i.status === "Menunggu" &&
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      i.status === "Disetujui" &&
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      i.status === "Ditolak" &&
                        "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {i.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}