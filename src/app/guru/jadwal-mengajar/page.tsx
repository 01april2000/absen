import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const metadata = { title: "Jadwal Mengajar | Aplikasi Absen" };

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export default async function JadwalMengajarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const guru = await prisma.guru.findUnique({
    where: { authUserId: session.user.id },
  });
  if (!guru) redirect("/");

  const jadwal = await prisma.jadwal.findMany({
    where: { guru_id: guru.id },
    include: { mapel: true, kelas: true },
    orderBy: [{ hari: "asc" }, { jam_mulai: "asc" }],
  });

  const grouped = new Map<string, typeof jadwal>();
  for (const j of jadwal) {
    const day = j.hari ?? "Minggu";
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(j);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Jadwal Mengajar</h1>
        <p className="text-base text-muted-foreground">{jadwal.length} jadwal terdaftar</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HARI_ORDER.map((hari) => {
          const rows = grouped.get(hari) ?? [];
          return (
            <div key={hari} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <h2 className="font-heading text-xl font-medium">{hari}</h2>
                <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                  {rows.length} jadwal
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="text-base text-muted-foreground">Tidak ada jadwal</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {rows.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">
                          {j.mapel?.nama_mapel ?? "-"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {j.kelas?.nama_kelas ?? "-"}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {j.jam_mulai ?? "-"} – {j.jam_selesai ?? "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}