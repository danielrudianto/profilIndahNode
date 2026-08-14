import { Prisma } from "@prisma/client";
import { SalesInvoicePaymentModel } from "../../src/models/sales-invoice-payment.model";
import { PaymentMethodViewModel } from "../../src/models/payment-method.model";

/**
 * Perilaku SalesInvoicePaymentModel.
 *
 * Model ini mewakili satu setoran pembayaran atas sebuah faktur. Hanya ada satu
 * bidang uang — `value` — tetapi bidang itulah yang dijumlahkan controller untuk
 * memutuskan apakah faktur sudah lunas. Bila nilainya lolos sebagai teks,
 * penjumlahannya berubah menjadi penggabungan teks dan status lunas ikut salah.
 *
 * Yang perlu diperhatikan pada model ini: konstruktornya TIDAK sekadar menyalin
 * apa yang dikirim fromMap. Untuk payment_method ia selalu memanggil
 * PaymentMethodViewModel.fromMap sekali lagi, dan fungsi itu punya nilai bawaan
 * "Cash". Akibatnya keputusan yang sudah diambil fromMap bisa ditimpa diam-diam.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 21,
  sales_invoice_code_id: 11,
  payment_method_id: 2,
  value: desimal("1500.50"),
  date: new Date("2026-03-05T00:00:00.000Z"),
  payment_method: { id: 2, name: "BCA", description: "Transfer bank" },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas pembayaran", () => {
    const m = SalesInvoicePaymentModel.fromMap(barisPrisma);

    expect(m.id).toBe(21);
    expect(m.sales_invoice_code_id).toBe(11);
    expect(m.payment_method_id).toBe(2);
  });

  it("mengubah tanggal menjadi Date", () => {
    const m = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      date: "2026-03-05T00:00:00.000Z",
    });

    expect(m.date).toBeInstanceOf(Date);
    expect(m.date.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("menghasilkan instance SalesInvoicePaymentModel, bukan objek biasa", () => {
    expect(SalesInvoicePaymentModel.fromMap(barisPrisma)).toBeInstanceOf(
      SalesInvoicePaymentModel
    );
  });
});

describe("Bidang uang value", () => {
  it("mengubah Prisma.Decimal menjadi number sungguhan", () => {
    const m = SalesInvoicePaymentModel.fromMap(barisPrisma);

    expect(typeof m.value).toBe("number");
    expect(m.value).toBe(1500.5);
  });

  it("mengubah teks DECIMAL dari query mentah menjadi number", () => {
    const m = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      value: "1500.50",
    });

    expect(typeof m.value).toBe("number");
    // Inilah alasan Number() penting: dua pembayaran dijumlahkan, bukan
    // digabungkan menjadi "1500.51500.5" yang membuat faktur tampak lunas.
    expect(m.value + m.value).toBe(3001);
  });

  it("menjumlah beberapa pembayaran dengan benar", () => {
    const daftar = ["1000.25", "500.25", "0.50"].map((v) =>
      SalesInvoicePaymentModel.fromMap({ ...barisPrisma, value: v })
    );

    const total = daftar.reduce((a, p) => a + p.value, 0);
    expect(total).toBe(1501);
  });

  it("mempertahankan galat pembulatan biner apa adanya (0.1 + 0.2)", () => {
    const a = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      value: desimal("0.1"),
    });
    const b = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      value: desimal("0.2"),
    });

    expect(a.value + b.value).toBeCloseTo(0.3, 10);
    expect(a.value + b.value).not.toBe(0.3);
  });

  /**
   * CACAT: value yang tidak dikirim menjadi NaN, bukan 0.
   *
   * Number(undefined) menghasilkan NaN, dan NaN menular ke setiap penjumlahan.
   * Satu baris pembayaran tanpa kolom value membuat TOTAL pembayaran faktur
   * menjadi NaN, sehingga sisa tagihan tampil kosong di layar dan perbandingan
   * "sudah lunas?" selalu bernilai salah — faktur yang sudah dibayar penuh pun
   * tetap tercatat belum lunas.
   */
  it("CACAT: value yang tidak dikirim menjadi NaN dan menular ke total", () => {
    const { value, ...tanpa } = barisPrisma;
    const m = SalesInvoicePaymentModel.fromMap(tanpa);

    expect(Number.isNaN(m.value)).toBe(true);
    expect(Number.isNaN(m.value + 1000)).toBe(true);
    expect(JSON.parse(JSON.stringify({ v: m.value })).v).toBeNull();
  });
});

describe("Relasi payment_method", () => {
  it("menerjemahkan relasi yang diikutkan menjadi PaymentMethodViewModel", () => {
    const m = SalesInvoicePaymentModel.fromMap(barisPrisma);

    expect(m.payment_method).toBeInstanceOf(PaymentMethodViewModel);
    expect(m.payment_method?.id).toBe(2);
    expect(m.payment_method?.name).toBe("BCA");
    expect(m.payment_method?.description).toBe("Transfer bank");
  });

  /**
   * CACAT: pembayaran tanpa metode bayar dilaporkan sebagai "Cash".
   *
   * fromMap sudah benar mengirim null bila relasinya null, dan undefined bila
   * relasinya tidak dimuat. Tetapi konstruktornya menimpa keputusan itu dengan
   * `PaymentMethodViewModel.fromMap(data.payment_method)`, dan fungsi tersebut
   * memakai perbandingan longgar `data == undefined` sehingga null pun ikut
   * tertangkap, lalu mengembalikan objek bawaan { id: null, name: "Cash" }.
   *
   * Akibatnya ada dua. Pertama, pembayaran yang metode bayarnya memang belum
   * diisi tampil sebagai TUNAI yang pasti, sehingga rekap kas harian menghitung
   * uang yang tidak pernah masuk laci dan selisihnya tidak terlihat. Kedua,
   * query yang kebetulan tidak memuat relasi payment_method menghasilkan
   * balasan yang tidak bisa dibedakan dari pembayaran tunai sungguhan — klien
   * tidak punya cara tahu bahwa datanya sebenarnya belum dimuat.
   */
  it("CACAT: payment_method null ditimpa menjadi objek 'Cash' palsu", () => {
    const m = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      payment_method_id: null,
      payment_method: null,
    });

    expect(m.payment_method_id).toBeNull();
    expect(m.payment_method).not.toBeNull();
    expect(m.payment_method?.name).toBe("Cash");
    expect(m.payment_method?.description).toBe("Cash");
    expect(m.payment_method?.id).toBeNull();
  });

  it("CACAT: relasi yang tidak dimuat juga menjadi 'Cash', bukan undefined", () => {
    const { payment_method, ...tanpa } = barisPrisma;
    const m = SalesInvoicePaymentModel.fromMap(tanpa);

    expect(m.payment_method).not.toBeUndefined();
    expect(m.payment_method?.name).toBe("Cash");
    // Bahkan ketika payment_method_id jelas menunjuk metode bayar nomor 2.
    expect(m.payment_method_id).toBe(2);
    expect(m.payment_method?.id).toBeNull();
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: date yang tidak dikirim menjadi Invalid Date.
   *
   * `new Date(undefined)` menghasilkan Invalid Date, yang diserialkan menjadi
   * null. Riwayat pembayaran menampilkan baris tanpa tanggal, dan pengurutan
   * riwayat berdasarkan tanggal menjadi acak karena setiap perbandingan dengan
   * NaN bernilai salah.
   */
  it("CACAT: date yang hilang menjadi Invalid Date", () => {
    const { date, ...tanpa } = barisPrisma;
    const m = SalesInvoicePaymentModel.fromMap(tanpa);

    expect(m.date).toBeInstanceOf(Date);
    expect(isNaN(m.date.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.date })).t).toBeNull();
  });

  /**
   * CACAT: date bernilai null menjadi 1 Januari 1970.
   *
   * `new Date(null)` tidak menghasilkan Invalid Date melainkan epoch. Klien
   * menerima tanggal yang tampak sah, jadi pembayaran tanpa tanggal muncul di
   * urutan paling awal riwayat dengan tanggal 1970 — terlihat seperti data
   * sungguhan yang salah, bukan data kosong.
   */
  it("CACAT: date bernilai null menjadi 1970-01-01, bukan Invalid Date", () => {
    const m = SalesInvoicePaymentModel.fromMap({ ...barisPrisma, date: null });

    expect(isNaN(m.date.getTime())).toBe(false);
    expect(m.date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });
});

/**
 * Bidang yang ada di konstruktor tetapi tidak diteruskan fromMap.
 *
 * `is_paid` dideklarasikan pada kelas, diterima konstruktor, dan dipakai jalur
 * penyimpanan untuk menandai bahwa faktur induknya menjadi lunas. Namun fromMap
 * tidak pernah mengirimnya, jadi objek yang dibangun dari baris basis data
 * selalu memiliki is_paid undefined dan kuncinya hilang dari JSON.
 *
 * Akibatnya frontend tidak bisa mengetahui dari satu baris pembayaran apakah
 * pembayaran itulah yang melunasi faktur; informasinya harus dihitung ulang dari
 * total pembayaran.
 */
describe("Bidang yang tidak diteruskan fromMap", () => {
  it("is_paid selalu undefined walau ada di baris basis data", () => {
    const m = SalesInvoicePaymentModel.fromMap({
      ...barisPrisma,
      is_paid: true,
    });

    expect(m.is_paid).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("is_paid");
  });

  it("konstruktor sendiri sebenarnya sanggup menyimpannya", () => {
    const m = new SalesInvoicePaymentModel({
      id: 21,
      sales_invoice_code_id: 11,
      payment_method_id: null,
      value: 1000,
      date: new Date("2026-03-05T00:00:00.000Z"),
      is_paid: true,
    });

    expect(m.is_paid).toBe(true);
  });
});
