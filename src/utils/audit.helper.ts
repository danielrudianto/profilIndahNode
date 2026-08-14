import { Prisma, PrismaClient } from "@prisma/client";
import {
  AUDITED_ACTIONS,
  AUDITED_MODELS,
  AUDIT_REDACTED_FIELDS,
} from "../constants/audit.constant";
import { penggunaSaatIni } from "./request-context.helper";

/**
 * Pencatat jejak audit, dipasang sebagai middleware Prisma.
 *
 * Dipilih di lapisan ini, bukan di controller, karena tidak ada jalur tulis
 * yang bisa lupa dipasangi — dan jalur yang terlupa tidak akan pernah
 * menimbulkan galat, ia hanya diam-diam tidak tercatat.
 */

/** Membuang bidang yang tidak boleh atau tidak berguna untuk dicatat. */
function saring(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const hasil: Record<string, unknown> = {};
  for (const [kunci, nilai] of Object.entries(
    data as Record<string, unknown>
  )) {
    if (AUDIT_REDACTED_FIELDS.includes(kunci)) continue;

    /*
      Nilai bersarang dilewati: pembuatan faktur membawa seluruh baris
      barangnya sebagai objek bertingkat, dan menyalinnya utuh membuat satu
      baris jejak berisi ribuan karakter yang tidak terbaca manusia.
    */
    if (
      nilai !== null &&
      typeof nilai === "object" &&
      !(nilai instanceof Date)
    ) {
      continue;
    }

    hasil[kunci] = nilai instanceof Date ? nilai.toISOString() : nilai;
  }

  return Object.keys(hasil).length ? hasil : null;
}

/**
 * Menyusun bentuk `changes` yang dibaca halaman aktivitas.
 *
 * `from` sengaja TIDAK diisi. Mengetahuinya menuntut satu pembacaan tambahan
 * sebelum setiap tulisan, dan itu menggandakan jumlah kueri pada seluruh jalur
 * tulis sistem — termasuk yang berada di dalam transaksi, tempat pembacaan
 * lewat klien biasa justru tidak melihat perubahan yang belum commit. Yang
 * dicatat adalah nilai yang DITETAPKAN, dan itu sudah menjawab pertanyaan
 * terpenting: apa yang diubah, oleh siapa, kapan.
 */
function susunPerubahan(data: unknown): Record<string, { to: unknown }> | null {
  const bersih = saring(data);
  if (!bersih) return null;

  const hasil: Record<string, { to: unknown }> = {};
  for (const [kunci, nilai] of Object.entries(bersih)) {
    hasil[kunci] = { to: nilai };
  }
  return hasil;
}

/** Mengambil id baris yang tersentuh, bila operasinya menyebutkannya. */
function ambilId(
  params: Prisma.MiddlewareParams,
  hasil: unknown
): number | null {
  const dariHasil = (hasil as { id?: unknown } | null)?.id;
  if (typeof dariHasil === "number") return dariHasil;

  const where = params.args?.where as { id?: unknown } | undefined;
  if (typeof where?.id === "number") return where.id;

  return null;
}

export function pasangPencatatAudit(prisma: PrismaClient): void {
  prisma.$use(async (params, next) => {
    const hasil = await next(params);

    const aksi = params.action ? AUDITED_ACTIONS[params.action] : undefined;
    if (!aksi || !params.model || !AUDITED_MODELS.includes(params.model)) {
      return hasil;
    }

    /*
      Pencatatannya TIDAK boleh menggagalkan operasi aslinya. Jejak audit
      adalah catatan pendamping; kehilangan satu barisnya jauh lebih ringan
      daripada membatalkan penyimpanan faktur yang sudah benar. Karena itu
      seluruh blok ini dibungkus try/catch yang hanya mencatat ke log.
    */
    try {
      const isiJejak = {
        entity: params.model,
        entity_id: ambilId(params, hasil),
        action: aksi,
        user_id: penggunaSaatIni(),
        changes: (susunPerubahan(params.args?.data) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        note: params.runInTransaction ? "dicatat dari dalam transaksi" : null,
      };

      /*
        BATASAN YANG PERLU DIKETAHUI PEMBACA JEJAK.

        Tulisan ini memakai klien dasar, sehingga ia berjalan pada koneksi
        tersendiri — TIDAK ikut transaksi yang sedang berjalan, dan karenanya
        TIDAK ikut dibatalkan bila transaksi itu gagal. Jejak untuk perubahan
        yang pada akhirnya tidak tersimpan tetap tertinggal.

        Itu sebabnya baris yang lahir dari dalam transaksi diberi catatan.
        Menyalurkannya ke klien transaksi tidak mungkin dari sini: middleware
        Prisma hanya menerima params dan next, bukan klien yang sedang dipakai.

        Kekeliruan arah sebaliknya lebih berbahaya: bila jejaknya ikut
        transaksi, kegagalan menulis jejak akan MEMBATALKAN penyimpanan faktur
        yang sudah benar. Catatan pendamping tidak layak menjatuhkan data
        aslinya.
      */
      await prisma.audit_log.create({ data: isiJejak });
    } catch (error) {
      console.error(`[error]: Gagal mencatat jejak audit — ${error}`);
    }

    return hasil;
  });
}
