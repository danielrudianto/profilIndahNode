import { Prisma, PrismaClient } from "@prisma/client";
import {
  AUDITED_ACTIONS,
  AUDITED_MODELS,
  AUDIT_REDACTED_FIELDS,
} from "../constants/audit.constant";
import { penggunaSaatIni } from "./request-context.helper";

/**
 * Pencatat jejak audit, dipasang sebagai client extension Prisma.
 *
 * Dipilih di lapisan ini, bukan di controller, karena tidak ada jalur tulis
 * yang bisa lupa dipasangi — dan jalur yang terlupa tidak akan pernah
 * menimbulkan galat, ia hanya diam-diam tidak tercatat.
 *
 * Dulu bentuknya middleware $use. Prisma 6 menghapus $use, dan padanannya
 * kini $extends dengan hook query — isinya sama, hanya wadahnya yang
 * berganti. Satu kemampuan hilang bersama $use: middleware lama diberi tahu
 * ketika operasinya berjalan di dalam transaksi (runInTransaction), hook
 * extension tidak. Baris jejak dari dalam transaksi karena itu tidak lagi
 * membawa catatan khusus — batasannya tetap sama (lihat komentar di bawah),
 * hanya penandanya yang tidak bisa diberikan.
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

type ArgsOperasi = { data?: unknown; where?: { id?: unknown } } | undefined;

/** Mengambil id baris yang tersentuh, bila operasinya menyebutkannya. */
function ambilId(args: ArgsOperasi, hasil: unknown): number | null {
  const dariHasil = (hasil as { id?: unknown } | null)?.id;
  if (typeof dariHasil === "number") return dariHasil;

  const where = args?.where;
  if (typeof where?.id === "number") return where.id;

  return null;
}

type HookOperasi = {
  model: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

/**
 * Logika hook-nya sendiri, terpisah dari pemasangan $extends supaya bisa
 * diuji murni — mesin extension Prisma tidak perlu ikut dihidupkan.
 * `dasar` cukup membawa audit_log; itulah satu-satunya yang disentuh.
 */
export function buatHookAudit(dasar: Pick<PrismaClient, "audit_log">) {
  return async ({ model, operation, args, query }: HookOperasi) => {
    const hasil = await query(args);

    const aksi = AUDITED_ACTIONS[operation];
    if (!aksi || !AUDITED_MODELS.includes(model)) {
      return hasil;
    }

    /*
            Pencatatannya TIDAK boleh menggagalkan operasi aslinya. Jejak audit
            adalah catatan pendamping; kehilangan satu barisnya jauh lebih
            ringan daripada membatalkan penyimpanan faktur yang sudah benar.
            Karena itu seluruh blok ini dibungkus try/catch yang hanya
            mencatat ke log.
          */
    try {
      const isian = args as ArgsOperasi;
      const isiJejak = {
        entity: model,
        entity_id: ambilId(isian, hasil),
        action: aksi,
        user_id: penggunaSaatIni(),
        changes: (susunPerubahan(isian?.data) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        note: null,
      };

      /*
              BATASAN YANG PERLU DIKETAHUI PEMBACA JEJAK.

              Tulisan ini memakai klien dasar, sehingga ia berjalan pada
              koneksi tersendiri — TIDAK ikut transaksi yang sedang berjalan,
              dan karenanya TIDAK ikut dibatalkan bila transaksi itu gagal.
              Jejak untuk perubahan yang pada akhirnya tidak tersimpan tetap
              tertinggal.

              Kekeliruan arah sebaliknya lebih berbahaya: bila jejaknya ikut
              transaksi, kegagalan menulis jejak akan MEMBATALKAN penyimpanan
              faktur yang sudah benar. Catatan pendamping tidak layak
              menjatuhkan data aslinya.
            */
      await dasar.audit_log.create({ data: isiJejak });
    } catch (error) {
      console.error(`[error]: Gagal mencatat jejak audit — ${error}`);
    }

    return hasil;
  };
}

/**
 * Membungkus klien dasar dengan pencatat audit dan mengembalikan klien
 * TURUNANNYA — inilah yang harus dipakai seluruh aplikasi.
 */
export function denganPencatatAudit(dasar: PrismaClient) {
  const hook = buatHookAudit(dasar);
  return dasar.$extends({
    name: "pencatat-audit",
    query: {
      $allModels: {
        $allOperations: hook as never,
      },
    },
  });
}
