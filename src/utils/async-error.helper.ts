import express, { NextFunction, Request, Response } from "express";

/**
 * Membuat Express meneruskan penolakan promise ke penanganan galat.
 *
 * MASALAH YANG DIPECAHKAN
 *
 * Express 4 hanya menangkap lemparan yang SINKRON. Handler `async` yang
 * melempar menghasilkan promise yang ditolak, dan Express tidak pernah
 * melihatnya: permintaannya menggantung tanpa balasan, lalu Node 15 ke atas
 * menghentikan SELURUH proses karena unhandled rejection. Satu galat kecil
 * pada satu permintaan karena itu mematikan server dan memutus permintaan lain
 * yang sedang berjalan.
 *
 * Dua jalur yang terbukti memicunya:
 *
 *   Dua belas handler menunggu repository tanpa try/catch sama sekali, jadi
 *   satu galat basis data sesaat sudah cukup.
 *
 *   translateKeyword dulu melempar untuk kata kunci berisi "%". Sisi itu sudah
 *   ditambal terpisah, tetapi penyebab strukturalnya ada di sini — handler
 *   berikutnya yang melempar akan mengulang cerita yang sama.
 *
 * CARA KERJA
 *
 * `express.Router` adalah prototipe dari setiap router yang dibuat
 * `express.Router()`, dan method perutean seperti .get dan .post ada padanya.
 * Dengan membungkus method itu sekali, setiap handler yang didaftarkan di
 * seluruh aplikasi ikut terlindungi — termasuk yang ditulis kemudian, tanpa
 * perlu menyentuh tiga puluh tiga berkas route.
 *
 * Sengaja memakai jalur ini, BUKAN menambal Layer.handle_request seperti
 * pustaka sejenis: Layer adalah bagian dalam Express yang tidak diekspor,
 * sedangkan express.Router adalah bagian dari antarmuka resminya.
 *
 * Handler yang mengembalikan promise ditempeli .catch(next), sehingga
 * penolakannya masuk ke penanganan galat Express persis seperti lemparan
 * sinkron. Handler yang tidak mengembalikan promise sama sekali tidak berubah.
 *
 * Dipanggil sekali dari app.ts, SEBELUM router mana pun dipasang.
 */

const METODE_PERUTEAN = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "all",
] as const;

type Handler = (...args: unknown[]) => unknown;

function bungkus(fn: unknown): unknown {
  if (typeof fn !== "function") return fn;

  const asli = fn as Handler & { __terbungkus?: boolean };
  if (asli.__terbungkus) return asli;

  // Middleware penangan galat dikenali Express dari jumlah parameternya yang
  // empat. Membungkusnya akan mengubah jumlah itu dan membuatnya diperlakukan
  // sebagai handler biasa, jadi dibiarkan apa adanya.
  if (asli.length >= 4) return asli;

  const terbungkus = function (
    this: unknown,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const hasil = asli.call(this, req, res, next) as
      | Promise<unknown>
      | undefined;

    if (hasil && typeof hasil.catch === "function") {
      hasil.catch(next);
    }

    return hasil;
  };

  (terbungkus as Handler & { __terbungkus?: boolean }).__terbungkus = true;
  return terbungkus;
}

function aktifkanPenangkapGalatAsync(): void {
  const router = express.Router as unknown as Record<string, unknown> & {
    __sudahDitambal?: boolean;
  };

  // Menjaga agar pemanggilan berulang tidak menumpuk pembungkus.
  if (router.__sudahDitambal) return;
  router.__sudahDitambal = true;

  for (const metode of METODE_PERUTEAN) {
    const asli = router[metode] as Handler;
    if (typeof asli !== "function") continue;

    router[metode] = function (this: unknown, ...args: unknown[]) {
      // Argumen pertama adalah jalurnya, sisanya handler.
      const [jalur, ...handler] = args;
      return asli.call(this, jalur, ...handler.map(bungkus));
    };
  }
}

/**
 * Dijalankan saat modul ini diimpor, BUKAN saat app.ts memanggilnya.
 *
 * Pemanggilan `router.get(...)` di ketiga puluh tiga berkas route berjalan
 * ketika modulnya diimpor, bukan ketika aplikasinya dirakit. Kalau tambalan
 * ini menunggu dipanggil dari badan fungsi di app.ts, seluruh route sudah
 * telanjur terdaftar dengan handler yang belum terbungkus.
 *
 * Karena itu berkas ini harus berada di URUTAN IMPOR PALING ATAS pada app.ts.
 */
aktifkanPenangkapGalatAsync();

export default aktifkanPenangkapGalatAsync;
