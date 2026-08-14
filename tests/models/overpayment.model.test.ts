import { Prisma } from "@prisma/client";
import {
  OverpaymentCodeModel,
  OverpaymentModel,
} from "../../src/models/overpayment.model";
import { PaymentMethodModel } from "../../src/models/payment-method.model";

/**
 * Perilaku OverpaymentCodeModel.
 *
 * Kelebihan bayar adalah dokumen yang mencatat uang pelanggan yang harus
 * dikembalikan: berapa nilainya, lewat cara apa dikembalikan, ke rekening siapa,
 * dan kapan. Isinya nyaris seluruhnya bidang yang langsung dibaca manusia saat
 * mentransfer uang, jadi setiap bidang yang salah tampil berujung pada uang yang
 * dikirim ke tempat yang keliru atau tidak dikirim sama sekali.
 *
 * `value` adalah satu-satunya bidang uang, dan berasal dari kolom DECIMAL MySQL
 * sehingga sampai sebagai Prisma.Decimal atau teks — tidak pernah number.
 *
 * Model ini punya tiga pembungkus `new Date(...)` tanpa penjagaan, dan salah
 * satunya (return_payment_date) memang boleh kosong selama pengembalian belum
 * dijadwalkan.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 81,
  customer_id: 5,
  date: new Date("2026-06-01T00:00:00.000Z"),
  sales_deposit_code_id: 12,
  payment_method_id: 2,
  return_payment_method: "TRANSFER",
  return_payment_number: "1234567890",
  return_payment_date: new Date("2026-06-03T00:00:00.000Z"),
  return_payment_bank: "BCA",
  return_payment_name: "Budi Santoso",
  created_by: 3,
  created_at: new Date("2026-06-01T02:00:00.000Z"),
  value: desimal("1500.50"),
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas dokumen", () => {
    const m = OverpaymentCodeModel.fromMap(barisPrisma);

    expect(m.id).toBe(81);
    expect(m.customer_id).toBe(5);
    expect(m.sales_deposit_code_id).toBe(12);
    expect(m.payment_method_id).toBe(2);
  });

  it("menyalin seluruh rincian pengembalian uang", () => {
    const m = OverpaymentCodeModel.fromMap(barisPrisma);

    expect(m.return_payment_method).toBe("TRANSFER");
    expect(m.return_payment_number).toBe("1234567890");
    expect(m.return_payment_bank).toBe("BCA");
    expect(m.return_payment_name).toBe("Budi Santoso");
    expect(m.return_payment_date).toBeInstanceOf(Date);
    expect(m.return_payment_date.toISOString()).toBe(
      "2026-06-03T00:00:00.000Z"
    );
  });

  it("menyalin jejak pembuatan", () => {
    const m = OverpaymentCodeModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(3);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at.toISOString()).toBe("2026-06-01T02:00:00.000Z");
  });

  it("mengubah date menjadi Date walau datang sebagai teks", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      date: "2026-06-01T00:00:00.000Z",
    });

    expect(m.date).toBeInstanceOf(Date);
    expect(m.date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("bidang teks yang boleh kosong tetap null", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      return_payment_number: null,
      return_payment_bank: null,
      sales_deposit_code_id: null,
      payment_method_id: null,
    });

    expect(m.return_payment_number).toBeNull();
    expect(m.return_payment_bank).toBeNull();
    expect(m.sales_deposit_code_id).toBeNull();
    expect(m.payment_method_id).toBeNull();
  });

  it("menghasilkan instance OverpaymentCodeModel, bukan objek biasa", () => {
    expect(OverpaymentCodeModel.fromMap(barisPrisma)).toBeInstanceOf(
      OverpaymentCodeModel
    );
  });
});

describe("Bidang uang value", () => {
  it("mengubah Prisma.Decimal menjadi number sungguhan", () => {
    const m = OverpaymentCodeModel.fromMap(barisPrisma);

    expect(typeof m.value).toBe("number");
    expect(m.value).toBe(1500.5);
  });

  it("mengubah teks DECIMAL dari query mentah menjadi number", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      value: "1500.50",
    });

    expect(typeof m.value).toBe("number");
    // Bila lolos sebagai teks, rekap kelebihan bayar menjadi "1500.51500.5" —
    // nilai pengembalian yang tampil jauh lebih besar dari yang sebenarnya.
    expect(m.value + m.value).toBe(3001);
  });

  it("menjumlah beberapa dokumen dengan benar", () => {
    const daftar = ["1000.25", "500.25", "0.50"].map((v) =>
      OverpaymentCodeModel.fromMap({ ...barisPrisma, value: v })
    );

    expect(daftar.reduce((a, o) => a + o.value, 0)).toBe(1501);
  });

  it("mempertahankan galat pembulatan biner apa adanya (0.1 + 0.2)", () => {
    const a = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      value: desimal("0.1"),
    });
    const b = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      value: desimal("0.2"),
    });

    expect(a.value + b.value).toBeCloseTo(0.3, 10);
    expect(a.value + b.value).not.toBe(0.3);
  });

  /**
   * CACAT: value yang tidak dikirim menjadi NaN, bukan 0.
   *
   * Number(undefined) menghasilkan NaN, dan NaN diserialkan menjadi null. Layar
   * pengembalian dana menampilkan nominal kosong, sementara rekap total
   * kelebihan bayar ikut menjadi NaN karena NaN menular ke setiap penjumlahan.
   * Petugas tidak tahu berapa yang harus ditransfer ke pelanggan.
   */
  it("CACAT: value yang tidak dikirim menjadi NaN dan menular ke total", () => {
    const { value, ...tanpa } = barisPrisma;
    const m = OverpaymentCodeModel.fromMap(tanpa);

    expect(Number.isNaN(m.value)).toBe(true);
    expect(Number.isNaN(m.value + 1000)).toBe(true);
    expect(JSON.parse(JSON.stringify({ v: m.value })).v).toBeNull();
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: return_payment_date yang bernilai null menjadi 1 Januari 1970.
   *
   * Kolomnya boleh kosong selama pengembalian uang belum dijadwalkan — itu
   * keadaan normal. Tetapi fromMap membungkusnya `new Date(null)`, dan itu
   * menghasilkan epoch, bukan Invalid Date.
   *
   * Akibatnya setiap kelebihan bayar yang belum dijadwalkan dikirim dengan
   * tanggal pengembalian 1 Januari 1970 yang tampak sah. Di daftar yang diurutkan
   * menurut tanggal pengembalian, dokumen-dokumen ini menumpuk di paling atas
   * seolah paling mendesak; dan kode yang menganggap adanya tanggal sebagai
   * bukti pengembalian sudah dijadwalkan akan salah menyimpulkan pekerjaan itu
   * sudah beres.
   */
  it("CACAT: return_payment_date null menjadi 1970-01-01, bukan null", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      return_payment_date: null,
    });

    expect(m.return_payment_date).toBeInstanceOf(Date);
    expect(isNaN(m.return_payment_date.getTime())).toBe(false);
    expect(m.return_payment_date.toISOString()).toBe(
      "1970-01-01T00:00:00.000Z"
    );
  });

  /**
   * CACAT: tanggal yang tidak dikirim menjadi Invalid Date.
   *
   * Ketiga tanggal — date, return_payment_date, created_at — dibungkus
   * `new Date(...)` tanpa memeriksa nilainya lebih dulu. Yang tidak dikirim
   * menjadi Invalid Date, lalu diserialkan menjadi null, sehingga klien tidak
   * bisa membedakannya dari tanggal yang memang kosong.
   */
  it("CACAT: date, return_payment_date, dan created_at yang hilang menjadi Invalid Date", () => {
    const { date, return_payment_date, created_at, ...tanpa } = barisPrisma;
    const m = OverpaymentCodeModel.fromMap(tanpa);

    expect(isNaN(m.date.getTime())).toBe(true);
    expect(isNaN(m.return_payment_date.getTime())).toBe(true);
    expect(isNaN(m.created_at.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.created_at })).t).toBeNull();
  });
});

describe("Relasi", () => {
  it("customer yang diikutkan menjadi CustomerModel", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      customer: {
        id: 5,
        name: "Toko Maju",
        address: "Jl. Melati 10",
        npwp: null,
        pic: "Budi",
        phone_number: "0811",
        created_by: 2,
        created_at: new Date("2026-01-01"),
      },
    });

    expect(m.customer?.name).toBe("Toko Maju");
  });

  it("payment_method yang diikutkan menjadi PaymentMethodModel", () => {
    const m = OverpaymentCodeModel.fromMap({
      ...barisPrisma,
      payment_method: {
        id: 2,
        name: "BCA",
        description: "Transfer bank",
        created_by: 1,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        is_delete: false,
      },
    });

    expect(m.payment_method).toBeInstanceOf(PaymentMethodModel);
    expect(m.payment_method?.name).toBe("BCA");
  });

  /**
   * CACAT: relasi yang tidak dimuat dilaporkan sebagai null.
   *
   * Penjagaan customer dan payment_method ditulis `data.x == null ? null :
   * data.x == undefined ? undefined : ...` dengan perbandingan longgar. Karena
   * `undefined == null` bernilai benar, cabang pertama menangkap keduanya dan
   * cabang undefined menjadi kode mati.
   *
   * Akibatnya balasan daftar kelebihan bayar selalu memuat `customer: null` dan
   * `payment_method: null`. Frontend membacanya sebagai "dokumen ini memang tanpa
   * pelanggan dan tanpa metode bayar", lalu menampilkan baris tanpa nama —
   * padahal customer_id dan payment_method_id di baris yang sama jelas terisi.
   * Petugas tidak tahu uangnya harus dikembalikan ke siapa tanpa membuka
   * rinciannya satu per satu.
   */
  it("CACAT: customer dan payment_method yang tidak dimuat menjadi null, bukan undefined", () => {
    const m = OverpaymentCodeModel.fromMap(barisPrisma);

    expect(m.customer).toBeNull();
    expect(m.payment_method).toBeNull();
    // Buktinya keduanya sebenarnya ada di basis data.
    expect(m.customer_id).toBe(5);
    expect(m.payment_method_id).toBe(2);
  });

  it("relasi pengguna yang tidak dimuat tetap undefined", () => {
    expect(
      OverpaymentCodeModel.fromMap(barisPrisma)
        .user_overpayment_created_byTouser
    ).toBeUndefined();
  });
});

/**
 * OverpaymentModel — baris rincian kelebihan bayar — tidak memiliki fromMap.
 *
 * Kelas ini memegang bidang uang `value` juga, tetapi tidak ada satu pun jalur
 * penerjemahan dari baris basis data. Siapa pun yang membutuhkannya harus
 * membangunnya sendiri, dan konstruktornya menyalin apa adanya tanpa Number() —
 * jadi kolom DECIMAL yang masuk lewat jalan ini tetap berupa Decimal atau teks.
 */
describe("OverpaymentModel", () => {
  it("tidak menyediakan fromMap", () => {
    expect(
      (OverpaymentModel as unknown as Record<string, unknown>).fromMap
    ).toBeUndefined();
  });

  it("konstruktornya menyalin seluruh bidang apa adanya", () => {
    const m = new OverpaymentModel({
      id: 91,
      payment_method_id: 2,
      value: 1500.5,
      overpayment_code_id: 81,
    });

    expect(m).toBeInstanceOf(OverpaymentModel);
    expect(m.id).toBe(91);
    expect(m.payment_method_id).toBe(2);
    expect(m.value).toBe(1500.5);
    expect(m.overpayment_code_id).toBe(81);
    expect(m.payment_method).toBeUndefined();
  });

  /**
   * CACAT: value tidak pernah dikonversi menjadi number.
   *
   * Karena tidak ada fromMap dan konstruktornya tidak memakai Number(), nilai
   * dari kolom DECIMAL yang dibangun lewat kelas ini tetap berupa teks.
   * Penjumlahan rincian pengembalian lalu menjadi penggabungan teks: dua baris
   * senilai 1500.50 menghasilkan "1500.501500.50", bukan 3001. Nominal yang
   * ditransfer ke pelanggan bisa salah beberapa kali lipat.
   */
  it("CACAT: value berupa teks disimpan apa adanya dan menggabung saat dijumlah", () => {
    const m = new OverpaymentModel({
      payment_method_id: null,
      value: "1500.50" as unknown as number,
      overpayment_code_id: 81,
    });

    expect(typeof m.value).toBe("string");
    expect(m.value + m.value).toBe("1500.501500.50" as unknown as number);
  });
});
