import { PrismaClient } from "@prisma/client";
import { pasangPencatatAudit } from "./audit.helper";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || buatKlien();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/*
  Pencatat audit dipasang di sini, satu kali, pada klien yang sama yang dipakai
  seluruh repository. Memasangnya di tempat lain berisiko terpasang dua kali —
  middleware Prisma menumpuk, dan setiap perubahan akan tercatat berganda.

  Pemasangannya menyatu dengan pembuatan klien, bukan dipanggil terpisah,
  supaya klien yang sudah tersimpan di globalThis pada mode pengembangan tidak
  ikut dipasangi ulang setiap kali berkas ini dimuat ulang.
*/
function buatKlien(): PrismaClient {
  const klien = new PrismaClient();
  pasangPencatatAudit(klien);
  return klien;
}
