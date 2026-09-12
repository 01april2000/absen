"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";
import prisma from "@/lib/prisma";

type ActionResult = { error?: string; message?: string };

const guruSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  username: z.string().optional().nullable(),
  password: z.string().optional(),
  mapel_ids: z.array(z.coerce.number().int().positive()).optional(),
});

const siswaSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  rfid_uid: z.string().optional().nullable(),
  kelas_id: z.coerce.number().int().positive().optional().nullable(),
});

const mapelSchema = z.object({
  nama_mapel: z.string().min(1, "Nama mata pelajaran wajib diisi"),
  kode_mapel: z.string().min(1, "Kode mata pelajaran wajib diisi"),
});

const kelasSchema = z.object({
  nama_kelas: z.string().min(1, "Nama kelas wajib diisi"),
});

const deviceSchema = z.object({
  deviceId: z.string().min(1, "Device ID wajib diisi"),
  name: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

const jadwalSchema = z.object({
  mapel_id: z.coerce.number().int().positive().nullable(),
  guru_id: z.coerce.number().int().positive().nullable(),
  kelas_id: z.coerce.number().int().positive().nullable(),
  hari: z.enum(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]).nullable(),
  jam_mulai: z.string().optional().nullable(),
  jam_selesai: z.string().optional().nullable(),
});

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function createGuru(formData: FormData): Promise<ActionResult> {
  const rawMapelIds = formData.getAll("mapel_ids");
  const parsed = guruSchema.safeParse({
    nama: formValue(formData, "nama"),
    username: formValue(formData, "username"),
    password: formValue(formData, "password") ?? undefined,
    mapel_ids: rawMapelIds.length > 0 ? rawMapelIds : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  if (!parsed.data.password) {
    return { error: "Password wajib diisi untuk akun login" };
  }
  if (!parsed.data.username) {
    return { error: "Username wajib diisi untuk akun login" };
  }

  const email = `${parsed.data.username}@sekolah.ac.id`;
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      name: parsed.data.nama,
      email,
      emailVerified: true,
      role: "Guru",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(parsed.data.password),
        },
      },
      guru: {
        create: {
          nama: parsed.data.nama,
          username: parsed.data.username,
          mapel: {
            connect: (parsed.data.mapel_ids ?? []).map((id) => ({ id })),
          },
        },
      },
    },
  });

  revalidatePath("/admin/guru");
  return { message: "Data guru berhasil ditambahkan" };
}

export async function updateGuru(id: number, formData: FormData): Promise<ActionResult> {
  const rawMapelIds = formData.getAll("mapel_ids");
  const parsed = guruSchema.safeParse({
    nama: formValue(formData, "nama"),
    username: formValue(formData, "username"),
    password: formValue(formData, "password") ?? undefined,
    mapel_ids: rawMapelIds.length > 0 ? rawMapelIds : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  if (!parsed.data.username) {
    return { error: "Username wajib diisi" };
  }

  const guru = await prisma.guru.findUnique({ where: { id } });
  if (!guru) {
    return { error: "Guru tidak ditemukan" };
  }

  await prisma.guru.update({
    where: { id },
    data: {
      nama: parsed.data.nama,
      username: parsed.data.username,
      mapel: {
        set: (parsed.data.mapel_ids ?? []).map((id) => ({ id })),
      },
    },
  });

  if (guru.authUserId && parsed.data.password) {
    const credential = await prisma.account.findFirst({
      where: { userId: guru.authUserId, providerId: "credential" },
    });
    if (credential) {
      await prisma.account.update({
        where: { id: credential.id },
        data: { password: await hashPassword(parsed.data.password) },
      });
    }
    await prisma.user.update({
      where: { id: guru.authUserId },
      data: { name: parsed.data.nama },
    });
  }

  revalidatePath("/admin/guru");
  return { message: "Data guru berhasil diperbarui" };
}

export async function deleteGuru(id: number): Promise<ActionResult> {
  await prisma.guru.delete({ where: { id } });
  revalidatePath("/admin/guru");
  return { message: "Data guru berhasil dihapus" };
}

export async function createSiswa(formData: FormData): Promise<ActionResult> {
  const parsed = siswaSchema.safeParse({
    nis: formValue(formData, "nis"),
    nama: formValue(formData, "nama"),
    rfid_uid: formValue(formData, "rfid_uid"),
    kelas_id: formValue(formData, "kelas_id") ? formValue(formData, "kelas_id") : null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  try {
    await prisma.siswa.create({ data: parsed.data });
  } catch {
    return { error: "NIS atau RFID sudah digunakan" };
  }
  revalidatePath("/admin/siswa");
  return { message: "Data siswa berhasil ditambahkan" };
}

export async function updateSiswa(id: number, formData: FormData): Promise<ActionResult> {
  const parsed = siswaSchema.safeParse({
    nis: formValue(formData, "nis"),
    nama: formValue(formData, "nama"),
    rfid_uid: formValue(formData, "rfid_uid"),
    kelas_id: formValue(formData, "kelas_id") ? formValue(formData, "kelas_id") : null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  try {
    await prisma.siswa.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "NIS atau RFID sudah digunakan" };
  }
  revalidatePath("/admin/siswa");
  return { message: "Data siswa berhasil diperbarui" };
}

export async function deleteSiswa(id: number): Promise<ActionResult> {
  try {
    await prisma.siswa.delete({ where: { id } });
  } catch {
    return { error: "Data siswa tidak dapat dihapus karena memiliki relasi" };
  }
  revalidatePath("/admin/siswa");
  return { message: "Data siswa berhasil dihapus" };
}

export async function createMapel(formData: FormData): Promise<ActionResult> {
  const parsed = mapelSchema.safeParse({
    nama_mapel: formValue(formData, "nama_mapel"),
    kode_mapel: formValue(formData, "kode_mapel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.mapel.create({ data: parsed.data });
  revalidatePath("/admin/mapel");
  return { message: "Mata pelajaran berhasil ditambahkan" };
}

export async function updateMapel(id: number, formData: FormData): Promise<ActionResult> {
  const parsed = mapelSchema.safeParse({
    nama_mapel: formValue(formData, "nama_mapel"),
    kode_mapel: formValue(formData, "kode_mapel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.mapel.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/mapel");
  return { message: "Mata pelajaran berhasil diperbarui" };
}

export async function deleteMapel(id: number): Promise<ActionResult> {
  try {
    await prisma.mapel.delete({ where: { id } });
  } catch {
    return { error: "Mata pelajaran tidak dapat dihapus karena memiliki relasi" };
  }
  revalidatePath("/admin/mapel");
  return { message: "Mata pelajaran berhasil dihapus" };
}

export async function createJadwal(formData: FormData): Promise<ActionResult> {
  const parsed = jadwalSchema.safeParse({
    mapel_id: formValue(formData, "mapel_id"),
    guru_id: formValue(formData, "guru_id"),
    kelas_id: formValue(formData, "kelas_id"),
    hari: formValue(formData, "hari"),
    jam_mulai: formValue(formData, "jam_mulai"),
    jam_selesai: formValue(formData, "jam_selesai"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.jadwal.create({ data: parsed.data });
  revalidatePath("/admin/jadwal");
  return { message: "Jadwal berhasil ditambahkan" };
}

export async function updateJadwal(id: number, formData: FormData): Promise<ActionResult> {
  const parsed = jadwalSchema.safeParse({
    mapel_id: formValue(formData, "mapel_id"),
    guru_id: formValue(formData, "guru_id"),
    kelas_id: formValue(formData, "kelas_id"),
    hari: formValue(formData, "hari"),
    jam_mulai: formValue(formData, "jam_mulai"),
    jam_selesai: formValue(formData, "jam_selesai"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.jadwal.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/jadwal");
  return { message: "Jadwal berhasil diperbarui" };
}

export async function deleteJadwal(id: number): Promise<ActionResult> {
  try {
    await prisma.jadwal.delete({ where: { id } });
  } catch {
    return { error: "Jadwal tidak dapat dihapus karena memiliki relasi" };
  }
  revalidatePath("/admin/jadwal");
  return { message: "Jadwal berhasil dihapus" };
}

export async function createKelas(formData: FormData): Promise<ActionResult> {
  const parsed = kelasSchema.safeParse({
    nama_kelas: formValue(formData, "nama_kelas"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.kelas.create({ data: parsed.data });
  revalidatePath("/admin/kelas");
  return { message: "Kelas berhasil ditambahkan" };
}

export async function updateKelas(id: number, formData: FormData): Promise<ActionResult> {
  const parsed = kelasSchema.safeParse({
    nama_kelas: formValue(formData, "nama_kelas"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  await prisma.kelas.update({ where: { id }, data: parsed.data });
  revalidatePath("/admin/kelas");
  return { message: "Kelas berhasil diperbarui" };
}

export async function deleteKelas(id: number): Promise<ActionResult> {
  try {
    await prisma.kelas.delete({ where: { id } });
  } catch {
    return { error: "Kelas tidak dapat dihapus karena memiliki relasi" };
  }
  revalidatePath("/admin/kelas");
  return { message: "Kelas berhasil dihapus" };
}

export async function setTitipTugasStatus(
  id: number,
  status: "Menunggu" | "Disetujui" | "Ditolak"
): Promise<ActionResult> {
  const titip = await prisma.titipTugas.findUnique({ where: { id } });
  if (!titip) {
    return { error: "Data titip tugas tidak ditemukan" };
  }
  await prisma.titipTugas.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/titip-tugas");
  return { message: "Status titip tugas diperbarui" };
}

export async function createDevice(formData: FormData): Promise<ActionResult> {
  const parsed = deviceSchema.safeParse({
    deviceId: formValue(formData, "deviceId"),
    name: formValue(formData, "name"),
    location: formValue(formData, "location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const apiKey = `absen_${randomUUID().replace(/-/g, "")}`;
  try {
    await prisma.device.create({ data: { ...parsed.data, apiKey } });
  } catch {
    return { error: "Device ID sudah digunakan" };
  }
  revalidatePath("/admin/device");
  return { message: "Device berhasil ditambahkan" };
}

export async function updateDevice(id: number, formData: FormData): Promise<ActionResult> {
  const parsed = deviceSchema.safeParse({
    deviceId: formValue(formData, "deviceId"),
    name: formValue(formData, "name"),
    location: formValue(formData, "location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  try {
    await prisma.device.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Device ID sudah digunakan" };
  }
  revalidatePath("/admin/device");
  return { message: "Device berhasil diperbarui" };
}

export async function regenerateDeviceApiKey(id: number): Promise<ActionResult> {
  const apiKey = `absen_${randomUUID().replace(/-/g, "")}`;
  await prisma.device.update({ where: { id }, data: { apiKey } });
  revalidatePath("/admin/device");
  return { message: "API key baru telah dibuat" };
}

export async function toggleDeviceActive(id: number, isActive: boolean): Promise<ActionResult> {
  await prisma.device.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/device");
  return { message: isActive ? "Device diaktifkan" : "Device dinonaktifkan" };
}

export async function deleteDevice(id: number): Promise<ActionResult> {
  try {
    await prisma.device.delete({ where: { id } });
  } catch {
    return { error: "Data device tidak dapat dihapus" };
  }
  revalidatePath("/admin/device");
  return { message: "Device berhasil dihapus" };
}