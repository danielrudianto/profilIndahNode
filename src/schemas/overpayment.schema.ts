import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { present, requiredIntFromText, requiredText } from "./common.schema";

/**
 * Kontrak API untuk domain kelebihan bayar (overpayment).
 *
 * Berkas ini mendefinisikan bentuk data yang MASUK dan KELUAR lewat HTTP. Ia
 * bukan definisi tabel — struktur basis data tetap di prisma/schema.prisma.
 * Keduanya sengaja dipisah: kontrak API boleh lebih ketat daripada basis data.
 *
 * Susunannya mengikuti lapis yang sama dengan supplier.schema.ts:
 *
 *   Base      bidang bersama, ditulis sekali
 *   Create    untuk POST — Base apa adanya
 *   Response  bentuk balasan
 *
 * Lapis Update tidak ada karena domain ini memang tidak punya rute ubah;
 * kelebihan bayar hanya dibuat, dibaca, dan dilaporkan.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutan kunci di sini mengikuti persis urutan pemasangan
 * rantai validator yang digantikan: date, value, customer_id,
 * payment_method_id, return_payment_date, return_payment_method,
 * return_payment_name, return_payment_bank, return_payment_number.
 */

/**
 * Nominal uang wajib, tanpa pemaksaan tipe.
 *
 * common.schema.ts hanya menyediakan `requiredInt`, dan bidang ini bukan bilangan
 * bulat — kolomnya Decimal(12, 2), jadi 1500.50 harus tetap diterima. Karena
 * common.schema.ts tidak boleh diubah dalam perubahan ini, bentuk pecahannya
 * ditulis lokal di sini dengan pola dua-pesan yang sama seperti `requiredInt`:
 * satu pesan untuk nilai yang tidak dikirim, satu untuk nilai yang dikirim
 * tetapi tidak sah. Rantai lama juga memasang dua aturan berurutan pada bidang
 * yang sama — notEmpty() lalu isFloat() — masing-masing dengan pesannya
 * sendiri, dan skema dengan satu pesan saja akan mengubah kalimat yang dilihat
 * pengguna ketika bidangnya tidak dikirim.
 *
 * Batas bawahnya TIDAK diperlonggar. Ini bidang uang: nilai negatif dan nol
 * ditolak rantai lama lewat isFloat({ min: 0.1 }), dan harus tetap ditolak.
 */
const uangWajib = (pesanKosong: string, pesanSalah: string, min: number) =>
  z
    .number({
      error: (iss) =>
        iss.input === undefined || iss.input === null || iss.input === ""
          ? pesanKosong
          : pesanSalah,
    })
    .min(min, pesanSalah);

/** Nominal minimum yang diterima rute pembuatan — dari isFloat({ min: 0.1 }). */
const NOMINAL_MINIMUM = 0.1;

/**
 * Bidang yang dimiliki bersama oleh permintaan pembuatan.
 *
 * Tiga tingkat ketegasan dipakai di sini, dan bedanya disengaja:
 *
 *   requiredText   bidang yang jelas berupa teks dan rantai lamanya notEmpty()
 *   z.enum      bidang yang rantai lamanya isIn() dengan daftar tertutup
 *   present    bidang yang rantai lamanya hanya exists()
 *
 * `present` sengaja TIDAK diganti z.number() atau z.string() walaupun
 * kebijakan ketat di common.schema.ts mengarah ke sana. exists() meloloskan
 * null dan teks kosong, dan keempat kolomnya memang nullable di basis data
 * (customer_id Int?, payment_method_id Int?, return_payment_bank String?,
 * return_payment_number String?). Pemanggil yang memilih "Cash" wajar mengirim
 * return_payment_bank: null; menolaknya bukan lagi soal tipe melainkan
 * mengubah bidang opsional menjadi wajib. Pengetatannya keputusan terpisah
 * yang perlu dibahas dengan sisi klien.
 */
const kelebihanBayarBase = z.object({
  /*
    Bidang tanggal dikirim sebagai teks ISO dan diteruskan controller ke
    `new Date(...)`. Karena tipenya jelas teks, kebijakan ketat berlaku penuh:
    angka epoch seperti 1700000000000 dulu diterima notEmpty(), sekarang
    ditolak. JSON sudah membawa tipe aslinya, jadi menerima angka di bidang
    tanggal hanya menyembunyikan cacat di sisi pemanggil.
  */
  date: requiredText(ErrorList["Date required"]),
  value: uangWajib(
    ErrorList["Amount is required"],
    ErrorList["Amount must be numeric"],
    NOMINAL_MINIMUM
  ),
  customer_id: present(ErrorList["Customer ID is required"]),
  payment_method_id: present(ErrorList["Payment method required"]),
  return_payment_date: requiredText(ErrorList["Return date is required"]),
  /*
    isIn(["Cash", "Bank transfer"]) bekerja pada bentuk teks nilainya, sehingga
    daftar tertutupnya sudah menolak semua nilai bukan teks dengan sendirinya.
    z.enum karena itu berperilaku sama persis, bukan lebih ketat. Satu pesan
    saja sudah cukup: rantai lama pun memakai pesan yang sama untuk nilai yang
    tidak dikirim maupun nilai di luar daftar, karena aturannya cuma satu.
  */
  return_payment_method: z.enum(["Cash", "Bank transfer"], {
    error: ErrorList["Return payment method must be either Cash or Transfer"],
  }),
  return_payment_name: requiredText(ErrorList["Return name is required"]),
  return_payment_bank: present(ErrorList["Return payment bank is required"]),
  return_payment_number: present(
    ErrorList["Return payment number is required"]
  ),
});

/**
 * POST /overpayment
 *
 * `sales_deposit_code_id` sengaja tidak ada di sini walaupun controller
 * membacanya dan meneruskannya ke repository. Rantai lama tidak pernah
 * memvalidasinya, jadi menambahkannya sekarang akan menolak permintaan yang
 * selama ini diterima. Kolomnya nullable, dan nilai yang tidak dikirim berakhir
 * sebagai undefined yang diabaikan Prisma — bukan galat.
 *
 * `userId` juga tidak divalidasi. Nilainya ditulis authMiddleware ke req.body,
 * bukan dikirim klien; memvalidasinya berarti memperlakukan identitas pemanggil
 * seolah masukan pengguna.
 */
export const createOverpaymentSchema = kelebihanBayarBase;

/**
 * POST /overpayment/return
 *
 * Hanya menyaring laporan berdasarkan tanggal, bukan membuat entitas, jadi
 * bidangnya tidak diambil dari kelebihanBayarBase. Menyebar `shape` dari base
 * yang punya sembilan bidang lalu membuang delapan di antaranya justru
 * menyembunyikan bahwa rute ini memang hanya butuh satu bidang.
 */
export const refundReportSchema = z.object({
  date: requiredText(ErrorList["Date required"]),
});

/**
 * GET /overpayment/:id
 *
 * Dua pesan berbeda karena rantai lama memasang dua aturan berurutan:
 * notEmpty() lalu isInt({ min: 0 }).
 *
 * Pesan pertama ("ID is required") praktis tidak pernah muncul: Express tidak
 * mencocokkan `/overpayment/` tanpa segmen — permintaan itu jatuh ke rute
 * GET `/` — jadi `id` selalu terisi. Pesan itu tetap dipasang supaya rutenya
 * tidak bergantung pada detail perutean yang bisa berubah.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA. requiredIntFromText mengubah teks menjadi
 * angka dengan Number(), sedangkan isInt() bekerja pada bentuk teksnya.
 * Akibatnya beberapa penulisan yang dulu ditolak sekarang diterima: "1e2"
 * (100), "0x10" (16), dan " 5 ". Angkanya sendiri tetap bilangan bulat >= 0
 * saat sampai ke controller, jadi tidak ada nilai baru yang bisa lolos ke basis
 * data — yang berubah hanya penulisan yang diampuni. Perlakuan ini sama dengan
 * paramCustomerReceivableSchema di receivable.schema.ts, supaya penulisan id
 * tidak berbeda-beda antar rute.
 */
export const getOverpaymentSchema = z.object({
  id: requiredIntFromText(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    0
  ),
});

export type CreateOverpayment = z.infer<typeof createOverpaymentSchema>;
export type RefundReport = z.infer<typeof refundReportSchema>;
export type GetOverpayment = z.infer<typeof getOverpaymentSchema>;
