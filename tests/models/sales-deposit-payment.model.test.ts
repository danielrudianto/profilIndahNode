import { Prisma } from "@prisma/client";
import { SalesDepositPaymentModel } from "../../src/models/sales-deposit-payment.model";
import { PaymentMethodViewModel } from "../../src/models/payment-method.model";

/**
 * Perilaku SalesDepositPaymentModel.
 *
 * Model ini mewakili satu setoran atas uang muka (deposit) pelanggan. Isinya
 * salinan hampir persis dari SalesInvoicePaymentModel — bidang, penjagaan, dan
 * cacatnya sama, hanya nama kolom induknya yang berbeda. Karena itu setiap cacat
 * yang ada di sini juga muncul di berkas pembayaran faktur; memperbaikinya nanti
 * harus dilakukan di kedua tempat.
 *
 * `value` adalah bidang uang. Nilainya berasal dari kolom DECIMAL MySQL, jadi
 * datang sebagai Prisma.Decimal atau teks, tidak pernah sebagai number. Nilai
 * deposit dipakai untuk memotong tagihan pelanggan, sehingga salah tipe di sini
 * berarti salah potongan di faktur.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 31,
  sales_deposit_code_id: 12,
  payment_method_id: 4,
  value: desimal("1500.50"),
  date: new Date("2026-04-05T00:00:00.000Z"),
  payment_method: { id: 4, name: "Mandiri", description: "Transfer bank" },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas setoran", () => {
    const m = SalesDepositPaymentModel.fromMap(barisPrisma);

    expect(m.id).toBe(31);
    expect(m.sales_deposit_code_id).toBe(12);
    expect(m.payment_method_id).toBe(4);
  });

  it("mengubah tanggal menjadi Date", () => {
    const m = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      date: "2026-04-05T00:00:00.000Z",
    });

    expect(m.date).toBeInstanceOf(Date);
    expect(m.date.toISOString()).toBe("2026-04-05T00:00:00.000Z");
  });

  it("menghasilkan instance SalesDepositPaymentModel, bukan objek biasa", () => {
    expect(SalesDepositPaymentModel.fromMap(barisPrisma)).toBeInstanceOf(
      SalesDepositPaymentModel
    );
  });
});

describe("Bidang uang value", () => {
  it("mengubah Prisma.Decimal menjadi number sungguhan", () => {
    const m = SalesDepositPaymentModel.fromMap(barisPrisma);

    expect(typeof m.value).toBe("number");
    expect(m.value).toBe(1500.5);
  });

  it("mengubah teks DECIMAL dari query mentah menjadi number", () => {
    const m = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      value: "1500.50",
    });

    expect(typeof m.value).toBe("number");
    // Bila lolos sebagai teks, hasilnya "1500.51500.5" dan sisa deposit
    // pelanggan menjadi angka raksasa yang tidak masuk akal.
    expect(m.value + m.value).toBe(3001);
  });

  it("menjumlah beberapa setoran dengan benar", () => {
    const daftar = ["1000.25", "500.25", "0.50"].map((v) =>
      SalesDepositPaymentModel.fromMap({ ...barisPrisma, value: v })
    );

    expect(daftar.reduce((a, p) => a + p.value, 0)).toBe(1501);
  });

  it("mempertahankan galat pembulatan biner apa adanya (0.1 + 0.2)", () => {
    const a = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      value: desimal("0.1"),
    });
    const b = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      value: desimal("0.2"),
    });

    expect(a.value + b.value).toBeCloseTo(0.3, 10);
    expect(a.value + b.value).not.toBe(0.3);
  });

  /**
   * CACAT: value yang tidak dikirim menjadi NaN, bukan 0.
   *
   * Number(undefined) menghasilkan NaN dan NaN menular ke seluruh penjumlahan.
   * Satu baris setoran tanpa kolom value membuat total deposit pelanggan
   * menjadi NaN, sehingga sisa deposit tampil kosong di layar dan potongan
   * otomatis pada faktur berikutnya tidak pernah terhitung.
   */
  it("CACAT: value yang tidak dikirim menjadi NaN dan menular ke total", () => {
    const { value, ...tanpa } = barisPrisma;
    const m = SalesDepositPaymentModel.fromMap(tanpa);

    expect(Number.isNaN(m.value)).toBe(true);
    expect(Number.isNaN(m.value + 1000)).toBe(true);
    expect(JSON.parse(JSON.stringify({ v: m.value })).v).toBeNull();
  });
});

describe("Relasi payment_method", () => {
  it("menerjemahkan relasi yang diikutkan menjadi PaymentMethodViewModel", () => {
    const m = SalesDepositPaymentModel.fromMap(barisPrisma);

    expect(m.payment_method).toBeInstanceOf(PaymentMethodViewModel);
    expect(m.payment_method?.id).toBe(4);
    expect(m.payment_method?.name).toBe("Mandiri");
  });

  /**
   * CACAT: setoran tanpa metode bayar dilaporkan sebagai "Cash".
   *
   * fromMap sudah mengirim null untuk relasi yang null, tetapi konstruktornya
   * memanggil ulang `PaymentMethodViewModel.fromMap(data.payment_method)`.
   * Fungsi itu memakai perbandingan longgar `data == undefined`, yang ikut
   * menangkap null, lalu mengembalikan objek bawaan { id: null, name: "Cash" }.
   *
   * Akibatnya setoran deposit yang metode bayarnya belum diisi tampil sebagai
   * setoran TUNAI yang pasti. Rekap kas harian menghitung uang yang tidak pernah
   * masuk laci, dan selisihnya tidak akan terlihat dari layar ini.
   */
  it("CACAT: payment_method null ditimpa menjadi objek 'Cash' palsu", () => {
    const m = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      payment_method_id: null,
      payment_method: null,
    });

    expect(m.payment_method_id).toBeNull();
    expect(m.payment_method).not.toBeNull();
    expect(m.payment_method?.name).toBe("Cash");
    expect(m.payment_method?.id).toBeNull();
  });

  it("CACAT: relasi yang tidak dimuat juga menjadi 'Cash', bukan undefined", () => {
    const { payment_method, ...tanpa } = barisPrisma;
    const m = SalesDepositPaymentModel.fromMap(tanpa);

    expect(m.payment_method).not.toBeUndefined();
    expect(m.payment_method?.name).toBe("Cash");
    // Padahal payment_method_id jelas menunjuk metode bayar nomor 4.
    expect(m.payment_method_id).toBe(4);
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: date yang tidak dikirim menjadi Invalid Date.
   *
   * Diserialkan menjadi null, sehingga riwayat setoran menampilkan baris tanpa
   * tanggal dan pengurutannya menjadi acak — setiap perbandingan dengan NaN
   * bernilai salah.
   */
  it("CACAT: date yang hilang menjadi Invalid Date", () => {
    const { date, ...tanpa } = barisPrisma;
    const m = SalesDepositPaymentModel.fromMap(tanpa);

    expect(m.date).toBeInstanceOf(Date);
    expect(isNaN(m.date.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.date })).t).toBeNull();
  });

  /**
   * CACAT: date bernilai null menjadi 1 Januari 1970.
   *
   * `new Date(null)` menghasilkan epoch, bukan Invalid Date. Setoran tanpa
   * tanggal muncul di puncak riwayat dengan tanggal 1970 yang tampak sah, jadi
   * pengguna membacanya sebagai data salah, bukan data kosong.
   */
  it("CACAT: date bernilai null menjadi 1970-01-01", () => {
    const m = SalesDepositPaymentModel.fromMap({ ...barisPrisma, date: null });

    expect(isNaN(m.date.getTime())).toBe(false);
    expect(m.date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });
});

/**
 * Bidang yang ada di konstruktor tetapi tidak diteruskan fromMap.
 *
 * `is_paid` dipakai jalur penyimpanan untuk menandai bahwa deposit induknya
 * menjadi lunas, tetapi fromMap tidak pernah mengirimnya. Objek yang dibangun
 * dari baris basis data selalu kehilangan bidang itu, sehingga frontend tidak
 * bisa tahu setoran mana yang melunasi deposit tanpa menghitung ulang totalnya.
 */
describe("Bidang yang tidak diteruskan fromMap", () => {
  it("is_paid selalu undefined walau ada di baris basis data", () => {
    const m = SalesDepositPaymentModel.fromMap({
      ...barisPrisma,
      is_paid: true,
    });

    expect(m.is_paid).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("is_paid");
  });

  it("konstruktor sendiri sebenarnya sanggup menyimpannya", () => {
    const m = new SalesDepositPaymentModel({
      id: 31,
      sales_deposit_code_id: 12,
      payment_method_id: null,
      value: 1000,
      date: new Date("2026-04-05T00:00:00.000Z"),
      is_paid: true,
    });

    expect(m.is_paid).toBe(true);
  });
});
