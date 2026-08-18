import { PrismaClient } from "@prisma/client";
import { denganPencatatAudit } from "./audit.helper";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || buatKlien();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/*
  Pencatat audit dipasang di sini, satu kali, pada klien yang sama yang dipakai
  seluruh repository. Memasangnya di tempat lain berisiko terpasang dua kali —
  hook-nya menumpuk, dan setiap perubahan akan tercatat berganda.

  Pemasangannya menyatu dengan pembuatan klien, bukan dipanggil terpisah,
  supaya klien yang sudah tersimpan di globalThis pada mode pengembangan tidak
  ikut dipasangi ulang setiap kali berkas ini dimuat ulang.

  $extends mengembalikan klien TURUNAN dengan tipe tersendiri; ia dituang
  kembali menjadi PrismaClient karena seluruh permukaan yang dipakai
  repository ($queryRaw, $transaction, model.*) ada utuh di turunannya,
  dan tiga puluhan repository yang menerima PrismaClient di konstruktornya
  tidak perlu tahu pembungkusnya.
*/
function buatKlien(): PrismaClient {
  const dasar = new PrismaClient();
  return denganPencatatAudit(dasar) as unknown as PrismaClient;
}
