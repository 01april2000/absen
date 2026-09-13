import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  computeStatus,
  formatJam,
  getHari,
  getJakartaMinutes,
  getJakartaNow,
  getJakartaParts,
  jakartaDateFromMs,
  startOfJakartaDay,
  startOfJakartaNextDay,
  toMinutes,
} from "@/lib/attendance";

export const dynamic = "force-dynamic";

const attendanceSchema = z.object({
  eventId: z.string().trim().min(1).max(200).optional(),
  uid: z.string().trim().min(1).max(64),
  deviceId: z.string().trim().min(1).max(64),
  timestamp: z.string().trim().optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function error(message: string, status: number) {
  return json({ success: false, message }, status);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

function buildData(
  record: Awaited<ReturnType<typeof createAttendance>>
): {
  studentName: string;
  className: string | null;
  mapel: string | null;
  nis: string;
  status: string;
  time: string | null;
} {
  const siswa = record.siswa!;
  const jadwal = record.jadwal!;
  return {
    studentName: siswa.nama,
    className: jadwal.kelas?.nama_kelas ?? null,
    mapel: jadwal.mapel?.nama_mapel ?? null,
    nis: siswa.nis,
    status: record.status ?? "",
    time: record.jam,
  };
}

async function createAttendance(args: {
  eventId: string | null;
  deviceIdPk: number;
  siswaId: number;
  mapelId: number | null;
  jadwalId: number;
  tanggal: Date;
  jam: string;
  status: "Hadir" | "Terlambat";
}) {
  return prisma.absensi.create({
    data: {
      event_id: args.eventId,
      siswa_id: args.siswaId,
      mapel_id: args.mapelId,
      jadwal_id: args.jadwalId,
      device_id: args.deviceIdPk,
      tanggal: args.tanggal,
      jam: args.jam,
      status: args.status,
    },
    include: {
      siswa: true,
      jadwal: { include: { kelas: true, mapel: true } },
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Body harus berupa JSON yang valid", 400);
  }

  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Data tidak valid", 400);
  }

  const { eventId, uid, deviceId, timestamp } = parsed.data;

  const apiKey = bearerToken(request);
  if (!apiKey) {
    return error("Missing API key", 401);
  }

  const device = await prisma.device.findFirst({
    where: { apiKey },
    select: { id: true, deviceId: true, isActive: true },
  });
  if (!device || device.deviceId !== deviceId) {
    return error("Device tidak dikenali", 401);
  }
  if (!device.isActive) {
    return error("Device tidak aktif", 403);
  }

  if (eventId) {
    const existing = await prisma.absensi.findUnique({
      where: { event_id: eventId },
      include: {
        siswa: true,
        jadwal: { include: { kelas: true, mapel: true } },
      },
    });
    if (existing?.siswa && existing.jadwal) {
      return json({
        success: true,
        message: "Absensi berhasil",
        data: buildData(existing),
      });
    }
  }

  const siswa = await prisma.siswa.findUnique({
    where: { rfid_uid: uid },
    include: { kelas: true },
  });
  if (!siswa || !siswa.isActive) {
    return error("Kartu RFID tidak terdaftar", 404);
  }
  if (!siswa.kelas_id) {
    return error("Siswa belum memiliki kelas", 409);
  }

  const serverNow = getJakartaNow();
  let slotDate = serverNow;

  if (timestamp) {
    const clientTs = Date.parse(timestamp);
    if (Number.isFinite(clientTs)) {
      const candidate = jakartaDateFromMs(clientTs);
      if (
        startOfJakartaDay(candidate).getTime() ===
        startOfJakartaDay(serverNow).getTime()
      ) {
        slotDate = candidate;
      }
    }
  }

  const hari = getHari(slotDate);
  const slotMin = getJakartaMinutes(slotDate);

  const jadwals = await prisma.jadwal.findMany({
    where: { kelas_id: siswa.kelas_id, hari },
    include: { kelas: true, mapel: true },
    orderBy: { jam_mulai: "asc" },
  });

  const jadwal = jadwals.find((j) => {
    if (!j.jam_mulai) return false;
    const start = toMinutes(j.jam_mulai);
    if (slotMin < start) return false;
    if (j.jam_selesai) return slotMin < toMinutes(j.jam_selesai);
    return true;
  });
  if (!jadwal || !jadwal.jam_mulai) {
    return error("Tidak ada jadwal saat ini", 409);
  }

  const dayStart = startOfJakartaDay(slotDate);
  const dayEnd = startOfJakartaNextDay(slotDate);
  const duplicate = await prisma.absensi.findFirst({
    where: {
      siswa_id: siswa.id,
      jadwal_id: jadwal.id,
      tanggal: { gte: dayStart, lt: dayEnd },
    },
  });
  if (duplicate) {
    return error("Siswa sudah melakukan absensi", 409);
  }

  const status = computeStatus(slotMin, toMinutes(jadwal.jam_mulai));

  try {
    const record = await createAttendance({
      eventId: eventId ?? null,
      deviceIdPk: device.id,
      siswaId: siswa.id,
      mapelId: jadwal.mapel_id,
      jadwalId: jadwal.id,
      tanggal: dayStart,
      jam: formatJam(getJakartaParts(slotDate)),
      status,
    });
    return json({
      success: true,
      message: "Absensi berhasil",
      data: buildData(record),
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const race = eventId
        ? await prisma.absensi.findUnique({
            where: { event_id: eventId },
            include: {
              siswa: true,
              jadwal: { include: { kelas: true, mapel: true } },
            },
          })
        : await prisma.absensi.findFirst({
            where: {
              siswa_id: siswa.id,
              jadwal_id: jadwal.id,
              tanggal: { gte: dayStart, lt: dayEnd },
            },
            include: {
              siswa: true,
              jadwal: { include: { kelas: true, mapel: true } },
            },
          });
      if (race?.siswa && race.jadwal) {
        return json({
          success: true,
          message: "Absensi berhasil",
          data: buildData(race),
        });
      }
    }
    console.error("Attendance create error:", e);
    return error("Terjadi kesalahan server", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}