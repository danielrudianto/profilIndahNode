import { Prisma } from "@prisma/client";
import {
  SalesReturnCodeModel,
  SalesReturnModel,
} from "../../src/models/sales-return.model";
import { PaymentMethodModel } from "../../src/models/payment-method.model";

/**
 * Perilaku SalesReturnCodeModel.
 *
 * Retur penjualan adalah dokumen pengembalian barang: jumlah barang yang
 * dikembalikan dikalikan harga baris faktur aslinya menjadi uang yang harus
 * dikembalikan ke pelanggan. Karena itu nilai uangnya tidak disimpan di dokumen
 * retur, melainkan diambil dari relasi sales_invoice tiap barisnya — yang berarti
 * ketepatan model ini bergantung pada relasi yang ikut dimuat.
 *
 * Tiga hal yang paling mudah rusak di sini:
 *
 *   Seluruh tanggal dibungkus `new Date(...)` tanpa penjagaan, termasuk
 *   confirmed_at yang secara sah boleh bernilai null.
 *
 *   Bidang boolean disalin mentah tanpa normalisasi, jadi tipenya mengikuti apa
 *   pun yang diberikan basis data.
 *
 *   Larik sales_return dipetakan dengan tangan, dan salah satu bidangnya
 *   mengambil nilai dari kolom yang keliru.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 51,
  name: "SR/2026/001",
  date: new Date("2026-05-01T00:00:00.000Z"),
  payment_method_id: 2,
  created_by: 3,
  created_at: new Date("2026-05-01T02:00:00.000Z"),
  is_confirm: true,
  is_delete: false,
  confirmed_by: 4,
  confirmed_at: new Date("2026-05-02T00:00:00.000Z"),
  sales_invoice_code_id: 11,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas retur", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.id).toBe(51);
    expect(m.name).toBe("SR/2026/001");
    expect(m.payment_method_id).toBe(2);
    expect(m.sales_invoice_code_id).toBe(11);
  });

  it("menyalin jejak pembuatan dan konfirmasi", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(3);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at.toISOString()).toBe("2026-05-01T02:00:00.000Z");
    expect(m.confirmed_by).toBe(4);
    expect(m.confirmed_at?.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("mengubah date menjadi Date walau datang sebagai teks", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      date: "2026-05-01T00:00:00.000Z",
    });

    expect(m.date).toBeInstanceOf(Date);
    expect(m.date.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("menghasilkan instance SalesReturnCodeModel, bukan objek biasa", () => {
    expect(SalesReturnCodeModel.fromMap(barisPrisma)).toBeInstanceOf(
      SalesReturnCodeModel
    );
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: confirmed_at yang bernilai null menjadi 1 Januari 1970.
   *
   * Kolom confirmed_at memang NULL selama retur belum dikonfirmasi — itu keadaan
   * normal, bukan data rusak. Tetapi fromMap membungkusnya `new Date(null)` tanpa
   * penjagaan, dan `new Date(null)` menghasilkan epoch, bukan Invalid Date.
   *
   * Akibatnya SETIAP retur yang belum dikonfirmasi dikirim dengan tanggal
   * konfirmasi 1 Januari 1970 yang tampak sah sepenuhnya. Frontend menampilkan
   * "dikonfirmasi 01/01/1970", dan yang lebih berbahaya: kode yang menganggap
   * adanya confirmed_at sebagai bukti retur sudah dikonfirmasi akan meloloskan
   * retur yang sebenarnya masih menunggu persetujuan. Ini cacat paling serius
   * pada model ini.
   */
  it("CACAT: confirmed_at null menjadi 1970-01-01, bukan null", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      confirmed_at: null,
      confirmed_by: null,
      is_confirm: false,
    });

    expect(m.confirmed_at).not.toBeNull();
    expect(m.confirmed_at).toBeInstanceOf(Date);
    expect(isNaN(m.confirmed_at!.getTime())).toBe(false);
    expect(m.confirmed_at!.toISOString()).toBe("1970-01-01T00:00:00.000Z");
    // Padahal konfirmasinya jelas belum terjadi.
    expect(m.confirmed_by).toBeNull();
    expect(m.is_confirm).toBe(false);
  });

  /**
   * CACAT: date dan created_at yang tidak dikirim menjadi Invalid Date.
   *
   * Diserialkan menjadi null, sehingga klien tidak dapat membedakannya dari
   * tanggal yang memang kosong, dan pengurutan daftar retur menjadi acak karena
   * setiap perbandingan dengan NaN bernilai salah.
   */
  it("CACAT: date dan created_at yang hilang menjadi Invalid Date", () => {
    const { date, created_at, ...tanpa } = barisPrisma;
    const m = SalesReturnCodeModel.fromMap(tanpa);

    expect(isNaN(m.date.getTime())).toBe(true);
    expect(isNaN(m.created_at.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.date })).t).toBeNull();
  });
});

describe("Penanganan kolom boolean", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.is_confirm).toBe(true);
    expect(m.is_delete).toBe(false);
  });

  /**
   * CACAT: tidak ada normalisasi boolean sama sekali.
   *
   * Kolom TinyInt MySQL sampai sebagai angka 1/0, dan lewat query mentah sebagai
   * teks "1"/"0". Keduanya diteruskan mentah.
   *
   * Teks yang berbahaya: "0" adalah string tidak kosong sehingga TRUTHY. Retur
   * yang belum dikonfirmasi (is_confirm = "0") tampil sebagai sudah dikonfirmasi
   * — artinya barang dianggap sudah diterima kembali dan uang dianggap sudah
   * dikembalikan, padahal belum ada yang menyetujui. Retur yang belum dihapus
   * (is_delete = "0") pun terbaca sebagai terhapus dan hilang dari daftar.
   */
  it("CACAT: teks '0' diteruskan apa adanya dan bersifat truthy", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      is_confirm: "0",
      is_delete: "0",
    });

    expect(typeof m.is_confirm).toBe("string");
    expect(Boolean(m.is_confirm)).toBe(true);
    expect(Boolean(m.is_delete)).toBe(true);
  });

  it("CACAT: angka 1 dan 0 juga tidak diubah menjadi boolean", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      is_confirm: 1,
      is_delete: 0,
    });

    expect(typeof m.is_confirm).toBe("number");
    expect((m.is_confirm as unknown) === true).toBe(false);
    expect(m.is_delete).toBe(0 as unknown as boolean);
  });

  it("CACAT: boolean yang tidak dikirim menghilang dari JSON", () => {
    const { is_confirm, ...tanpa } = barisPrisma;
    const m = SalesReturnCodeModel.fromMap(tanpa);

    expect(m.is_confirm).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("is_confirm");
  });
});

describe("Larik bersarang sales_return", () => {
  const barisRetur = {
    id: 61,
    quantity: desimal("3"),
    sales_invoice_id: 71,
    sales_return_code_id: 51,
    sales_invoice: {
      id: 71,
      product_id: 4,
      product_unit_id: null,
      quantity: desimal("10"),
      price: desimal("15000.50"),
      discount: desimal("500.25"),
    },
  };

  it("larik kosong tetap kosong", () => {
    expect(
      SalesReturnCodeModel.fromMap({ ...barisPrisma, sales_return: [] })
        .sales_return
    ).toEqual([]);
  });

  it("satu anggota: jumlah retur diubah menjadi number", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      sales_return: [barisRetur],
    });

    expect(m.sales_return).toHaveLength(1);
    expect(typeof m.sales_return![0].quantity).toBe("number");
    expect(m.sales_return![0].quantity).toBe(3);
    expect(m.sales_return![0].sales_invoice_id).toBe(71);
  });

  it("relasi baris faktur ikut diterjemahkan, termasuk nilai uangnya", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      sales_return: [barisRetur],
    });

    const faktur = m.sales_return![0].sales_invoice!;
    expect(typeof faktur.price).toBe("number");
    expect(faktur.price).toBe(15000.5);
    expect(faktur.discount).toBe(500.25);
    // Nilai uang yang dikembalikan dihitung dari sini, jadi perkaliannya harus
    // menghasilkan angka, bukan penggabungan teks.
    expect(m.sales_return![0].quantity * faktur.price).toBe(45001.5);
  });

  it("sales_return yang tidak dikirim menjadi undefined", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.sales_return).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("sales_return");
  });

  /**
   * CACAT: sales_return_code_id diambil dari kolom yang keliru.
   *
   * Pemetaannya menulis `sales_return_code_id: x.sales_invoice_code_id`. Baris
   * tabel sales_return tidak punya kolom bernama sales_invoice_code_id — yang ada
   * sales_return_code_id — jadi nilainya selalu undefined dan kuncinya hilang
   * dari JSON.
   *
   * Akibatnya frontend yang menerima daftar baris retur tidak tahu baris itu
   * milik dokumen retur yang mana. Selama barisnya dibaca lewat dokumen induknya
   * hal ini tidak terasa, tetapi begitu baris retur dikirim atau dikirim balik
   * secara terpisah (misalnya untuk menyunting satu baris), acuannya kosong dan
   * penyimpanannya menunjuk dokumen yang salah atau gagal sama sekali.
   */
  it("CACAT: sales_return_code_id selalu undefined karena salah nama kolom", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      sales_return: [barisRetur],
    });

    expect(m.sales_return![0].sales_return_code_id).toBeUndefined();
    // Nilainya ada di baris basis data, hanya tidak pernah dibaca.
    expect(barisRetur.sales_return_code_id).toBe(51);
    expect(JSON.stringify(m)).not.toContain("sales_return_code_id");
  });

  /**
   * CACAT: id baris retur tidak ikut disalin.
   *
   * Objek yang dibangun hanya memuat quantity, sales_invoice_id,
   * sales_return_code_id, dan sales_invoice. Kunci utama barisnya dibuang.
   *
   * Akibatnya frontend tidak punya pegangan untuk menyunting atau menghapus satu
   * baris retur; satu-satunya cara memperbaiki kesalahan jumlah adalah mengirim
   * ulang seluruh dokumen.
   */
  it("CACAT: id baris retur hilang dari hasil pemetaan", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      sales_return: [barisRetur],
    });

    expect(m.sales_return![0].id).toBeUndefined();
  });

  /**
   * CACAT: isi sales_return bukan instance SalesReturnModel.
   *
   * fromMap membangun objek literal, padahal bidangnya dideklarasikan
   * SalesReturnModel[]. TypeScript tidak menangkapnya karena masukan fromMap
   * bertipe any. Untuk JSON hasilnya sama, jadi cacat ini hanya menggigit kode
   * di sisi server yang memakai `instanceof`.
   */
  it("CACAT: baris retur berupa objek biasa, bukan SalesReturnModel", () => {
    const m = SalesReturnCodeModel.fromMap({
      ...barisPrisma,
      sales_return: [barisRetur],
    });

    expect(m.sales_return![0]).not.toBeInstanceOf(SalesReturnModel);
  });
});

describe("Relasi lain", () => {
  it("payment_method null tetap null", () => {
    expect(
      SalesReturnCodeModel.fromMap({ ...barisPrisma, payment_method: null })
        .payment_method
    ).toBeNull();
  });

  it("payment_method yang diikutkan menjadi PaymentMethodModel", () => {
    const m = SalesReturnCodeModel.fromMap({
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
   * CACAT: relasi payment_method yang tidak dimuat dilaporkan sebagai null.
   *
   * Urutan penjagaannya `data.payment_method == null ? null : ... == undefined ?
   * undefined : ...` memakai perbandingan longgar, dan `undefined == null`
   * bernilai benar, jadi cabang undefined adalah kode mati.
   *
   * Akibatnya balasan daftar retur selalu memuat `payment_method: null`, yang
   * dibaca frontend sebagai "pengembalian uang ini tanpa metode bayar" —
   * terlihat seperti pengembalian tunai — padahal metodenya hanya belum dimuat.
   * payment_method_id di baris yang sama justru menunjukkan sebaliknya.
   */
  it("CACAT: payment_method yang tidak dimuat menjadi null, bukan undefined", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.payment_method).toBeNull();
    expect(m.payment_method_id).toBe(2); // buktinya metodenya sebenarnya ada
  });

  it("relasi faktur dan pengguna yang tidak dimuat tetap undefined", () => {
    const m = SalesReturnCodeModel.fromMap(barisPrisma);

    expect(m.sales_invoice_code).toBeUndefined();
    expect(m.user_sales_return_code_created_byTouser).toBeUndefined();
  });
});

/**
 * SalesReturnModel tidak memiliki fromMap.
 *
 * Kelas barisnya hanya punya konstruktor, jadi tidak ada jalur penerjemahan dari
 * baris basis data untuk baris retur yang berdiri sendiri. Setiap tempat yang
 * membutuhkannya harus memetakan sendiri — dan itulah yang dilakukan
 * SalesReturnCodeModel.fromMap, lengkap dengan salah nama kolomnya.
 */
describe("SalesReturnModel", () => {
  it("tidak menyediakan fromMap", () => {
    expect(
      (SalesReturnModel as unknown as Record<string, unknown>).fromMap
    ).toBeUndefined();
  });

  it("konstruktornya menyalin bidang apa adanya tanpa konversi angka", () => {
    const m = new SalesReturnModel({
      id: 61,
      quantity: 3,
      sales_return_code_id: 51,
      sales_invoice_id: 71,
    });

    expect(m).toBeInstanceOf(SalesReturnModel);
    expect(m.id).toBe(61);
    expect(m.quantity).toBe(3);
    expect(m.sales_return_code_id).toBe(51);
    expect(m.sales_invoice_id).toBe(71);
    expect(m.sales_invoice).toBeUndefined();
  });

  /**
   * CACAT: quantity tidak pernah dikonversi di konstruktor.
   *
   * Karena tidak ada fromMap, siapa pun yang membangun kelas ini langsung dari
   * baris basis data akan menyimpan Prisma.Decimal atau teks apa adanya. Jumlah
   * barang yang dikembalikan lalu ikut penjumlahan sebagai teks: "3" + "2"
   * menjadi "32", bukan 5 — stok yang dikembalikan bisa tercatat berlipat.
   */
  it("CACAT: quantity berupa teks disimpan apa adanya oleh konstruktor", () => {
    const m = new SalesReturnModel({
      quantity: "3" as unknown as number,
      sales_return_code_id: 51,
      sales_invoice_id: 71,
    });

    expect(typeof m.quantity).toBe("string");
    expect(m.quantity + m.quantity).toBe("33" as unknown as number);
  });
});
