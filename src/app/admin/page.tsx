import {
  Users,
  GraduationCap,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock4,
  XCircle,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard | Aplikasi Absen" };

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default async function AdminDashboardPage() {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [guru, siswa, mapel, jadwal, absensiHariIni] = await Promise.all([
    prisma.guru.count(),
    prisma.siswa.count(),
    prisma.mapel.count(),
    prisma.jadwal.count(),
    prisma.absensi.findMany({
      where: {
        tanggal: { gte: today, lt: tomorrow },
      },
      include: { siswa: true, mapel: true },
      orderBy: { jam: "desc" },
      take: 8,
    }),
  ]);

  const [hadir, terlambat, alpha] = await Promise.all([
    prisma.absensi.count({
      where: { tanggal: { gte: today, lt: tomorrow }, status: "Hadir" },
    }),
    prisma.absensi.count({
      where: { tanggal: { gte: today, lt: tomorrow }, status: "Terlambat" },
    }),
    prisma.absensi.count({
      where: { tanggal: { gte: today, lt: tomorrow }, status: "Alpha" },
    }),
  ]);

  const stats = [
    { label: "Total Guru", value: guru, icon: GraduationCap },
    { label: "Total Siswa", value: siswa, icon: Users },
    { label: "Mata Pelajaran", value: mapel, icon: BookOpenText },
    { label: "Jadwal", value: jadwal, icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col gap-6">
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
            <h2 className="font-heading font-medium">Rekap Absensi Hari Ini</h2>
            <p className="text-sm text-muted-foreground">
              {today.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
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

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-heading font-medium">Absensi Terbaru</h2>
            <p className="text-sm text-muted-foreground">Data absensi hari ini</p>
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
      </div>
    </div>
  );
}