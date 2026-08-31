import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";

/**
 * Pembatas laju untuk rute masuk.
 *
 * ALASANNYA BUKAN TEORETIS. Berkas `dump.rdb` sempat ikut terlacak di
 * riwayat repositori publik ini, dan di dalamnya ada 38 hash bcrypt. Hash
 * yang sudah tersalin bisa diserang luring tanpa batas waktu; yang bisa
 * dijaga dari sisi ini hanyalah percobaan daringnya. Tanpa pembatas, tebakan
 * bisa dicoba secepat jaringan mengizinkan dan tidak ada satu pun jejak yang
 * menandainya sebagai serangan.
 *
 * Jendelanya lima belas menit dengan sepuluh percobaan. Angka itu longgar
 * untuk manusia — salah ketik tiga sampai empat kali masih jauh dari batas —
 * dan sempit untuk mesin.
 *
 * MEMBILANG YANG GAGAL SAJA (`skipSuccessfulRequests`). Kasir yang masuk
 * berkali-kali dalam sehari, atau beberapa orang yang berbagi satu koneksi
 * kantor, tidak boleh terkunci karena berhasil bekerja. Yang dibatasi adalah
 * kegagalan, dan kegagalan beruntun memang bentuk serangannya.
 *
 * Balasannya memakai kunci i18n seperti seluruh galat lain di sini, bukan
 * kalimat mentah — frontend menerjemahkan isinya apa adanya.
 */

/**
 * Kunci pembilang: alamat IP DIGABUNG dengan nama pengguna yang dicoba.
 *
 * IP saja tidak cukup dan bisa berbahaya. Seluruh kantor keluar lewat satu
 * alamat, jadi satu orang yang lupa kata sandinya akan mengunci semua
 * rekannya. Nama pengguna saja juga tidak cukup: penyerang tinggal berganti
 * nama pada tiap percobaan dan pembilangnya tidak pernah penuh.
 *
 * Digabung, keduanya menutup lubang masing-masing: satu penyerang yang
 * menghantam satu akun terkena batas, sementara rekan sekantor yang memakai
 * akun berbeda punya pembilang sendiri-sendiri.
 *
 * `req.ip` sudah benar karena app.ts menyetel `trust proxy` ke 1 — satu
 * proxy, yang terdekat. Menyetelnya `true` akan membuat nilai ini bisa
 * dikarang lewat X-Forwarded-For, dan pembatas ini ikut bisa dilewati.
 *
 * IP-nya DINORMALKAN lewat ipKeyGenerator, tidak dipakai mentah. Penyedia
 * internet membagikan blok IPv6 — lazimnya /64 — kepada satu pelanggan, jadi
 * satu penyerang bisa berganti alamat pada setiap percobaan tanpa berpindah
 * jaringan. Pembilang yang memakai alamat mentah tidak pernah penuh, dan
 * pembatas ini menjadi hiasan bagi siapa pun yang memakai IPv6.
 * ipKeyGenerator memampatkan alamat IPv6 ke awalannya sehingga seluruh blok
 * berbagi satu pembilang; alamat IPv4 dilewatkan apa adanya.
 *
 * Pustakanya sendiri yang menandai ini (ERR_ERL_KEY_GEN_IPV6) — peringatan
 * itu muncul saat tes dijalankan, dan isinya benar.
 */
function kunciPerAkun(req: Request): string {
  const ip = req.ip ? ipKeyGenerator(req.ip) : "tanpa-ip";
  const nama = String(req.body?.username ?? "")
    .trim()
    .toLowerCase();

  return `${ip}|${nama}`;
}

const balasanTerlaluSering = (_req: Request, res: Response) => {
  res.status(429).send(ErrorList["Too many attempts"]);
};

const dasar: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  /*
    Header standar RateLimit-* dikirim, header X-RateLimit-* lama tidak.
    Yang lama membocorkan ambang batasnya ke siapa pun yang bertanya tanpa
    memberi manfaat kepada klien mana pun di aplikasi ini.
  */
  standardHeaders: true,
  legacyHeaders: false,
  handler: balasanTerlaluSering,
};

/**
 * Pabrik, bukan hanya instansnya.
 *
 * express-rate-limit menyimpan pembilangnya di dalam instans middleware, jadi
 * satu instans yang dipakai bersama membuat hitungan bocor antar pemakaian.
 * Pada aplikasi yang berjalan itu justru yang diinginkan — satu pembilang
 * untuk seluruh proses. Pada jajaran uji, itu berarti tes yang satu mewarisi
 * hitungan tes sebelumnya, dan tes yang lolos hanya karena urutannya tidak
 * menjaga apa pun.
 *
 * Karena itu pabriknya ikut diekspor: tes membangun instans segar per kasus.
 */
export function buatPembatasMasuk() {
  return rateLimit({
    ...dasar,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: kunciPerAkun,
  });
}

/** Sepuluh kegagalan per lima belas menit, per pasangan IP + nama pengguna. */
export const pembatasMasuk = buatPembatasMasuk();

/**
 * Penyegaran token dibatasi lebih longgar dan HANYA per IP.
 *
 * Rutenya tidak menerima nama pengguna — yang dikirim adalah token — jadi
 * tidak ada yang bisa digabungkan. Batasnya dibuat tinggi karena beberapa tab
 * yang terbuka bersamaan bisa menyegarkan hampir berbarengan; yang dijaga di
 * sini hanya penyalahgunaan yang kasar.
 */
export const pembatasSegarkanToken = rateLimit({
  ...dasar,
  limit: 60,
});
