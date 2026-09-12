import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { hashPassword } from "@better-auth/utils/password";
import { randomUUID } from "node:crypto";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const EMAIL_DOMAIN = "sekolah.ac.id";
const DEFAULT_PASSWORD = "password123";
const ADMIN_PASSWORD = "admin12345";

const mapelData = [
  { nama_mapel: "Matematika", kode_mapel: "MTK" },
  { nama_mapel: "Bahasa Indonesia", kode_mapel: "BIN" },
  { nama_mapel: "Bahasa Inggris", kode_mapel: "BIG" },
  { nama_mapel: "IPA", kode_mapel: "IPA" },
  { nama_mapel: "IPS", kode_mapel: "IPS" },
  { nama_mapel: "Pendidikan Agama", kode_mapel: "PAB" },
  { nama_mapel: "Olahraga", kode_mapel: "OR" },
  { nama_mapel: "Seni Budaya", kode_mapel: "SBK" },
];

const guruData = [
  { nama: "Budi Santoso", username: "budi.santoso", mapel: "MTK" },
  { nama: "Siti Rahayu", username: "siti.rahayu", mapel: "BIN" },
  { nama: "Agus Wijaya", username: "agus.wijaya", mapel: "BIG" },
  { nama: "Dewi Lestari", username: "dewi.lestari", mapel: "IPA" },
  { nama: "Andi Pratama", username: "andi.pratama", mapel: "IPS" },
  { nama: "Rina Puspita", username: "rina.puspita", mapel: "PAB" },
  { nama: "Joko Susilo", username: "joko.susilo", mapel: "OR" },
  { nama: "Maya Anggraini", username: "maya.anggraini", mapel: "SBK" },
];

const adminAccount = {
  name: "Administrator",
  email: `admin@${EMAIL_DOMAIN}`,
  password: ADMIN_PASSWORD,
  role: Role.Admin,
};

type LoginUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

async function upsertLoginUser({ name, email, password, role }: LoginUserInput) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.role !== role) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role },
      });
    }

    const credential = await prisma.account.findFirst({
      where: { userId: existingUser.id, providerId: "credential" },
    });

    if (!credential) {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: existingUser.id,
          providerId: "credential",
          userId: existingUser.id,
          password: await hashPassword(password),
        },
      });
    }

    return existingUser.id;
  }

  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      role,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });

  return id;
}

async function main() {
  console.log("Memulai seeder guru & akun login...");

  for (const m of mapelData) {
    const exists = await prisma.mapel.findFirst({
      where: { kode_mapel: m.kode_mapel },
    });
    if (!exists) {
      await prisma.mapel.create({ data: m });
    }
  }
  console.log(`Mapel: ${mapelData.length} data siap.`);

  for (const g of guruData) {
    const mapel = await prisma.mapel.findFirst({ where: { kode_mapel: g.mapel } });
    const guru =
      (await prisma.guru.findUnique({ where: { username: g.username } })) ??
      (await prisma.guru.create({
        data: {
          nama: g.nama,
          username: g.username,
          mapel: mapel ? { connect: { id: mapel.id } } : undefined,
        },
      }));

    const userId = await upsertLoginUser({
      name: g.nama,
      email: `${g.username}@${EMAIL_DOMAIN}`,
      password: DEFAULT_PASSWORD,
      role: Role.Guru,
    });

    if (guru.authUserId !== userId) {
      await prisma.guru.update({
        where: { id: guru.id },
        data: { authUserId: userId },
      });
    }
  }
  console.log(`Guru: ${guruData.length} akun login siap.`);

  await upsertLoginUser(adminAccount);
  console.log("Admin: 1 akun login siap.");

  console.log("\n=== Akun demo ===");
  console.log(`- admin@${EMAIL_DOMAIN} (Admin) / ${ADMIN_PASSWORD}`);
  for (const g of guruData) {
    console.log(`- ${g.username}@${EMAIL_DOMAIN} (Guru) / ${DEFAULT_PASSWORD}`);
  }
  console.log("\nSeeder selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());