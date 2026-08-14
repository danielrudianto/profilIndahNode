import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredIntFromText } from "./common.schema";

/**
 * Kontrak API untuk domain piutang (receivable).
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan:
 * date, amount, full_payment, lalu payment_method_id.
 *
 * Rantai lama pada domain ini nyaris tidak memeriksa tipe: `date` cukup tidak
 * kosong (teks apa pun diterima, termasuk angka), dan `payment_method_id`
 * cukup ada (null pun lolos). Skema ini sengaja tidak mengetatkannya, karena
 * setiap pengetatan berarti menolak permintaan yang selama ini diterima
 * frontend. Pengetatannya perlu diputuskan terpisah bersama sisi pemanggil.
 */

/**
 * Mengubah nilai apa pun menjadi teks dengan aturan yang sama seperti
 * express-validator.
 *
 * Perlu ditiru karena validator-nya bekerja pada teks, bukan pada nilai asli:
 * angka 0 menjadi "0" dan lolos notEmpty(), sedangkan null menjadi "" dan
 * ditolak. Kalau di sini dipakai String() apa adanya, null akan berubah
 * menjadi "null" — teks yang tidak kosong — sehingga bidang wajib yang
 * dikirim bernilai null mendadak diterima.
 */
const keTeks = (nilai: unknown) =>
  nilai === undefined || nilai === null ? "" : String(nilai);

/**
 * Bentuk bilangan desimal yang diterima validator.isFloat().
 *
 * Polanya disalin dari pustaka validator, bukan diganti Number(), karena
 * Number() jauh lebih longgar: ia menerima " 5 ", "0x10", dan "\n7\n" sebagai
 * angka. Untuk bidang nominal uang, melonggarkan penerimaan tanpa diminta
 * bukan perbaikan — nilai yang bentuknya tidak wajar lebih baik ditolak di
 * pintu masuk seperti sebelumnya.
 *
 * Bagian bilangan, bagian pecahan, dan bagian eksponen semuanya opsional,
 * sehingga teks kosong dan "." ikut lolos pola. Keduanya tersaring oleh
 * parseFloat yang menghasilkan NaN, dan NaN >= 0 selalu salah.
 */
const POLA_DESIMAL = /^[-+]?[0-9]*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/;

const desimalTakNegatif = (nilai: unknown) => {
  const teks = keTeks(nilai);
  return POLA_DESIMAL.test(teks) && parseFloat(teks) >= 0;
};

/**
 * Teks yang dianggap boolean oleh validator.isBoolean() pada mode bawaan.
 * "yes", "on", dan variasi huruf besar seperti "TRUE" TIDAK termasuk.
 */
const BOOLEAN_TEKS = ["true", "false", "0", "1"];

/**
 * Meniru notEmpty(): nilai harus ada dan bentuk teksnya tidak kosong.
 *
 * Sengaja TIDAK memakai `required` dari common.schema. Yang di sana memakai
 * String(nilai) langsung, sedangkan di sini lewat keTeks() yang memetakan
 * undefined dan null menjadi teks kosong — persis seperti express-validator.
 * Bedanya terlihat pada nilai seperti null: String(null) menghasilkan "null"
 * yang dianggap terisi, sementara keTeks(null) menghasilkan "" yang ditolak.
 */
const required = (pesan: string) =>
  z.any().refine((nilai) => keTeks(nilai) !== "", { message: pesan });

/**
 * GET /receivable/customer/:id
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * requiredIntFromText mengubah teks menjadi angka dengan Number(), sedangkan
 * rantai lama memakai isInt() yang bekerja pada bentuk teksnya. Akibatnya
 * beberapa penulisan yang dulu ditolak sekarang diterima: "1e2" (100), "0x10"
 * (16), " 5 ", dan segmen yang hanya berisi spasi (menjadi 0). Angkanya
 * sendiri tetap bilangan bulat >= 0 saat sampai ke controller, jadi tidak ada
 * nilai baru yang bisa lolos ke basis data — yang berubah hanya penulisan
 * yang diampuni. Nilai 0 pun sudah diterima sebelumnya lewat `/customer/0`,
 * yang diartikan controller sebagai seluruh pelanggan. Menyamakannya persis
 * menuntut penulisan ulang isInt() di sini, dan penulisan seperti itu tidak
 * pernah datang dari frontend.
 *
 * Pesan pertama ("Customer ID is required") praktis tidak pernah muncul:
 * Express tidak mencocokkan `/customer/` tanpa segmen, jadi `id` selalu terisi.
 * Pesan itu tetap dipasang supaya rutenya tidak mengandalkan detail perutean.
 */
export const paramCustomerReceivableSchema = z.object({
  id: requiredIntFromText(
    ErrorList["Customer ID is required"],
    ErrorList["CUstomer ID must be integer"],
    0
  ),
});

/**
 * POST /receivable/payment
 *
 * `sales_invoice_id` sengaja tidak ada di sini walaupun controller memakainya
 * untuk mencari faktur yang dibayar. Rantai lama tidak memvalidasinya, dan
 * permintaan tanpa bidang itu berakhir sebagai galat dari lapisan basis data,
 * bukan 400. Menambahkannya sekarang akan mengubah status yang diterima
 * pemanggil; itu perbaikan tersendiri yang perlu pesan galatnya sendiri.
 *
 * `full_payment` diperiksa isBoolean() tanpa pemeriksaan keberadaan lebih
 * dulu, tetapi nilai yang tidak dikirim tetap tertolak karena bentuk teksnya
 * kosong. Efeknya bidang ini wajib, dengan pesan "Payment status required".
 */
export const createReceivablePaymentSchema = z.object({
  date: required(ErrorList["Date required"]),
  // Dua aturan pada satu bidang: yang pertama menjelaskan nilai yang tidak
  // dikirim, yang kedua nilai yang dikirim tetapi bukan bilangan >= 0.
  amount: required(ErrorList["Amount is required"]).refine(desimalTakNegatif, {
    message: ErrorList["Amount must be numeric"],
  }),
  full_payment: z
    .any()
    .refine((nilai) => BOOLEAN_TEKS.includes(keTeks(nilai)), {
      message: ErrorList["Payment status required"],
    }),
  // exists(): cukup dikirim. null dan string kosong lolos, persis seperti
  // sebelumnya — controller meneruskan apa adanya ke kolom yang nullable.
  payment_method_id: z.any().refine((nilai) => nilai !== undefined, {
    message: ErrorList["Payment method required"],
  }),
});

export type ParamCustomerReceivable = z.infer<
  typeof paramCustomerReceivableSchema
>;
export type CreateReceivablePayment = z.infer<
  typeof createReceivablePaymentSchema
>;
