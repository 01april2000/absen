"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

type ActionResult = { error?: string; message?: string };

const izinSchema = z.object({
  jenis: z.enum(["Izin", "Sakit"]),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  keterangan: z.string().optional().nullable(),
});

const titipTugasSchema = z.object({
  izin_id: z.coerce.number().int().positive(),
  kelas_id: z.coerce.number().int().positive(),
  jadwal_id: z.coerce.number().int().positive(),
  konten: z.string().min(1, "Tugas tidak boleh kosong"),
});

const HARI_INDEX = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

async function getGuruId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const guru = await prisma.guru.findUnique({
    where: { authUserId: session.user.id },
    select: { id: true },
  });
  return guru?.id ?? null;
}

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseTanggal(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function createIzin(formData: FormData): Promise<ActionResult> {
  const guruId = await getGuruId();
  if (!guruId) {
    return { error: "Sesi tidak valid" };
  }

  const parsed = izinSchema.safeParse({
    jenis: formValue(formData, "jenis"),
    tanggal: formValue(formData, "tanggal"),
    keterangan: formValue(formData, "keterangan"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await prisma.izin.create({
    data: {
      guru_id: guruId,
      jenis: parsed.data.jenis,
      tanggal: parseTanggal(parsed.data.tanggal),
      keterangan: parsed.data.keterangan,
    },
  });

  revalidatePath("/guru/izin");
  return { message: "Izin/sakit berhasil dicatat" };
}

export async function deleteIzin(id: number): Promise<ActionResult> {
  const guruId = await getGuruId();
  if (!guruId) {
    return { error: "Sesi tidak valid" };
  }

  const izin = await prisma.izin.findUnique({ where: { id } });
  if (!izin || izin.guru_id !== guruId) {
    return { error: "Data izin tidak ditemukan" };
  }

  await prisma.izin.delete({ where: { id } });

  revalidatePath("/guru/izin");
  return { message: "Izin/sakit berhasil dihapus" };
}

function isBlockNoteContent(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return false;
    }
    return parsed.some((block) => {
      const content = block?.content;
      if (typeof content === "string") {
        return content.trim().length > 0;
      }
      if (Array.isArray(content)) {
        return content.length > 0;
      }
      return false;
    });
  } catch {
    return false;
  }
}

export async function createTitipTugas(formData: FormData): Promise<ActionResult> {
  const guruId = await getGuruId();
  if (!guruId) {
    return { error: "Sesi tidak valid" };
  }

  const parsed = titipTugasSchema.safeParse({
    izin_id: formValue(formData, "izin_id"),
    kelas_id: formValue(formData, "kelas_id"),
    jadwal_id: formValue(formData, "jadwal_id"),
    konten: formValue(formData, "konten"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  if (!isBlockNoteContent(parsed.data.konten)) {
    return { error: "Tugas tidak boleh kosong" };
  }

  const izin = await prisma.izin.findUnique({
    where: { id: parsed.data.izin_id },
    select: { guru_id: true, tanggal: true },
  });
  if (!izin || izin.guru_id !== guruId) {
    return { error: "Data izin tidak ditemukan" };
  }

  const hariIzin = HARI_INDEX[izin.tanggal.getDay()];
  const jadwal = await prisma.jadwal.findFirst({
    where: {
      id: parsed.data.jadwal_id,
      guru_id: guruId,
      kelas_id: parsed.data.kelas_id,
      hari: hariIzin,
    },
  });
  if (!jadwal) {
    return { error: "Jadwal mengajar tidak ditemukan untuk kelas pada hari izin" };
  }

  await prisma.titipTugas.create({
    data: {
      izin_id: parsed.data.izin_id,
      guru_id: guruId,
      kelas_id: parsed.data.kelas_id,
      jadwal_id: parsed.data.jadwal_id,
      konten: parsed.data.konten,
    },
  });

  revalidatePath("/guru/izin");
  return { message: "Titip tugas berhasil dikirim" };
}

export async function deleteTitipTugas(id: number): Promise<ActionResult> {
  const guruId = await getGuruId();
  if (!guruId) {
    return { error: "Sesi tidak valid" };
  }

  const titip = await prisma.titipTugas.findUnique({ where: { id } });
  if (!titip || titip.guru_id !== guruId) {
    return { error: "Data titip tugas tidak ditemukan" };
  }
  if (titip.status !== "Menunggu") {
    return { error: "Titip tugas sudah diproses, tidak dapat dihapus" };
  }

  await prisma.titipTugas.delete({ where: { id } });

  revalidatePath("/guru/izin");
  return { message: "Titip tugas berhasil dihapus" };
}