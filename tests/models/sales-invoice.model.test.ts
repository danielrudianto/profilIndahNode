import { Prisma } from "@prisma/client";
import {
  SalesInvoiceModel,
  SalesInvoiceItemModel,
} from "../../src/models/sales-invoice.model";

/**
 * Perilaku SalesInvoiceModel.
 *
 * Ini model uang. Baris yang masuk berasal dari Prisma, dan kolom DECIMAL pada
 * MySQL tidak pernah sampai sebagai `number` — ia datang sebagai Prisma.Decimal
 * (atau teks pada query mentah). Selama fromMap membungkusnya dengan Number(),
 * penjumlahan di controller aman. Bila ada satu saja bidang uang yang lolos
 * sebagai teks, operator `+` di controller berubah menjadi penggabungan teks:
 * 1500.5 + 1500.5 menjadi "1500.51500.5", dan nilai tagihan yang tampil di
 * layar pelanggan salah tanpa satu pun galat muncul.
 *
 * Tiga sumber kerusakan lain yang diam-diam:
 *
 *   Kolom boolean MySQL (TinyInt) datang sebagai angka 1/0, atau sebagai teks
 *   "1"/"0" bila lewat query mentah. Model ini menyalinnya apa adanya, tanpa
 *   menormalkan, sehingga tipe di JSON ikut apa pun yang diberikan basis data.
 *
 *   `new Date(x)` tanpa penjagaan: nilai yang tidak dikirim menjadi Invalid
 *   Date, nilai null menjadi 1 Januari 1970.
 *
 *   Larik bersarang ditangani dengan aturan yang berbeda-beda: satu memakai []
 *   sebagai nilai bawaan, satunya undefined.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 11,
  name: "INV/2026/001",
  date: new Date("2026-03-01T00:00:00.000Z"),
  discount: desimal("1500.50"),
  delivery: desimal("2000.25"),
  service: desimal("0"),
  sales: "Andi",
  customer_id: 5,
  created_by: 2,
  created_at: new Date("2026-03-01T01:00:00.000Z"),
  is_confirm: true,
  confirmed_by: 3,
  confirmed_at: new Date("2026-03-02T00:00:00.000Z"),
  is_paid: false,
  is_delete: false,
  uuid: "3f1c-uuid",
  payment_term: 30,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas faktur", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(m.id).toBe(11);
    expect(m.name).toBe("INV/2026/001");
    expect(m.uuid).toBe("3f1c-uuid");
    expect(m.sales).toBe("Andi");
  });

  it("memetakan customer_id menjadi customerID", () => {
    expect(SalesInvoiceModel.fromMap(barisPrisma).customerID).toBe(5);
  });

  it("menyalin jejak pembuatan dan konfirmasi", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(m.createdBy).toBe(2);
    expect(m.createdAt).toBeInstanceOf(Date);
    expect(m.createdAt.toISOString()).toBe("2026-03-01T01:00:00.000Z");
    expect(m.confirmedBy).toBe(3);
    expect(m.confirmedAt).toEqual(new Date("2026-03-02T00:00:00.000Z"));
  });

  it("menghasilkan instance SalesInvoiceModel, bukan objek biasa", () => {
    expect(SalesInvoiceModel.fromMap(barisPrisma)).toBeInstanceOf(
      SalesInvoiceModel
    );
  });
});

describe("Bidang uang", () => {
  it("mengubah Prisma.Decimal menjadi number sungguhan", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(typeof m.discount).toBe("number");
    expect(typeof m.delivery).toBe("number");
    expect(typeof m.service).toBe("number");
    expect(m.discount).toBe(1500.5);
    expect(m.delivery).toBe(2000.25);
  });

  it("mengubah teks DECIMAL dari query mentah menjadi number", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      discount: "1500.50",
      delivery: "0.10",
      service: "0.20",
    });

    expect(m.discount).toBe(1500.5);
    // Penjumlahan benar-benar menjumlah, bukan menggabung teks.
    expect(m.discount + m.discount).toBe(3001);
  });

  it("mempertahankan galat pembulatan biner apa adanya (0.1 + 0.2)", () => {
    // Dicatat supaya jelas: konversi ke number memakai float ganda, jadi sisa
    // pecahan tetap ada. Pembulatan ke rupiah harus dilakukan saat menampilkan.
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      delivery: desimal("0.1"),
      service: desimal("0.2"),
    });

    expect(m.delivery + m.service).toBeCloseTo(0.3, 10);
    expect(m.delivery + m.service).not.toBe(0.3);
  });

  /**
   * CACAT: bidang uang yang tidak dikirim menjadi NaN, bukan 0.
   *
   * Number(undefined) menghasilkan NaN. Ini terjadi bila query hanya memilih
   * sebagian kolom (`select`) dan lupa menyertakan discount/delivery/service.
   *
   * Akibatnya berlapis. Di JSON, NaN diserialkan menjadi null, sehingga klien
   * mengira potongannya kosong. Lebih buruk lagi, bila controller menjumlahkan
   * nilai ini ke total, seluruh total ikut menjadi NaN — satu kolom yang hilang
   * membuat SELURUH nominal faktur tampil kosong di layar, bukan hanya kolom
   * itu saja.
   */
  it("CACAT: discount yang tidak dikirim menjadi NaN dan hilang saat diserialkan", () => {
    const { discount, ...tanpa } = barisPrisma;
    const m = SalesInvoiceModel.fromMap(tanpa);

    expect(Number.isNaN(m.discount)).toBe(true);
    expect(JSON.parse(JSON.stringify({ d: m.discount })).d).toBeNull();
    // Menular ke total.
    expect(Number.isNaN(m.discount + m.delivery)).toBe(true);
  });
});

describe("Penanganan kolom boolean", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(m.is_confirm).toBe(true);
    expect(m.isPaid).toBe(false);
    expect(m.isDelete).toBe(false);
  });

  /**
   * CACAT: tidak ada normalisasi boolean sama sekali.
   *
   * Berbeda dengan CustomerModel yang setidaknya menerjemahkan teks "1",
   * SalesInvoiceModel menyalin nilainya mentah-mentah. Nilai dari kolom TinyInt
   * MySQL bisa sampai sebagai angka 1/0, dan lewat query mentah sebagai teks
   * "1"/"0".
   *
   * Angka masih aman ditafsirkan frontend (1 truthy, 0 falsy). Teks TIDAK: di
   * JavaScript "0" adalah string tidak kosong, jadi nilainya TRUTHY. Faktur
   * yang belum lunas (is_paid = "0") akan tampil sebagai LUNAS di layar, dan
   * tombol pembayaran hilang. Uang pelanggan tercatat sudah masuk padahal
   * belum. Ini cacat dengan akibat paling langsung pada model ini.
   */
  it("CACAT: teks '0' dari basis data diteruskan apa adanya dan bersifat truthy", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      is_paid: "0",
      is_confirm: "0",
      is_delete: "0",
    });

    expect(m.isPaid).toBe("0" as unknown as boolean);
    expect(typeof m.isPaid).toBe("string");
    // Inilah akibatnya: pemeriksaan `if (invoice.isPaid)` bernilai benar.
    expect(Boolean(m.isPaid)).toBe(true);
    expect(Boolean(m.is_confirm)).toBe(true);
    expect(Boolean(m.isDelete)).toBe(true);
  });

  it("CACAT: angka 1 dan 0 juga tidak diubah menjadi boolean", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      is_confirm: 1,
      is_paid: 0,
      is_delete: 0,
    });

    expect(typeof m.is_confirm).toBe("number");
    expect(m.is_confirm).toBe(1 as unknown as boolean);
    expect(m.isPaid).toBe(0 as unknown as boolean);
    // Klien yang membandingkan dengan `=== true` akan selalu gagal.
    expect((m.is_confirm as unknown) === true).toBe(false);
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: `date` tidak pernah diubah menjadi Date.
   *
   * createdAt dibungkus `new Date(...)`, tetapi `date` — tanggal faktur, bidang
   * yang paling sering ditampilkan — disalin apa adanya walau tipenya
   * dideklarasikan Date. Bila baris berasal dari query mentah (jenis query yang
   * dipakai beberapa repository di repo ini), nilainya tetap berupa teks.
   *
   * Akibatnya kode yang memanggil `invoice.date.getTime()` atau membandingkan
   * dua tanggal faktur akan gagal atau membandingkan teks secara leksikografis,
   * padahal TypeScript menjamin bidang itu Date.
   */
  it("CACAT: date berupa teks tetap teks, bukan Date", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      date: "2026-03-01T00:00:00.000Z",
    });

    expect(typeof m.date).toBe("string");
    expect(m.date).not.toBeInstanceOf(Date);
    expect(() => (m.date as Date).getTime()).toThrow(TypeError);
  });

  /**
   * CACAT: created_at yang tidak dikirim menjadi Invalid Date.
   *
   * `new Date(undefined)` menghasilkan Invalid Date, yang menjadi null saat
   * diserialkan. Klien tidak dapat membedakannya dari tanggal yang memang
   * kosong, dan pengurutan daftar faktur berdasarkan tanggal buat menjadi acak
   * karena semua perbandingan dengan NaN bernilai salah.
   */
  it("CACAT: created_at yang hilang menjadi Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = SalesInvoiceModel.fromMap(tanpa);

    expect(m.createdAt).toBeInstanceOf(Date);
    expect(isNaN(m.createdAt.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.createdAt })).t).toBeNull();
  });

  it("confirmed_at yang null tetap null (tidak diubah menjadi 1970)", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      confirmed_at: null,
      confirmed_by: null,
    });

    expect(m.confirmedAt).toBeNull();
    expect(m.confirmedBy).toBeNull();
  });
});

describe("Larik bersarang sales_invoice", () => {
  const item = {
    id: 3,
    product_id: 4,
    product_unit_id: null,
    quantity: desimal("2"),
    price: desimal("15000.50"),
    discount: desimal("500.25"),
  };

  it("larik kosong tetap kosong", () => {
    const m = SalesInvoiceModel.fromMap({ ...barisPrisma, sales_invoice: [] });
    expect(m.sales_invoice).toEqual([]);
  });

  it("satu anggota: seluruh bidang uang dan jumlah diubah menjadi number", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice: [item],
    });

    expect(m.sales_invoice).toHaveLength(1);
    const baris = m.sales_invoice![0];
    expect(baris.id).toBe(3);
    expect(baris.product_id).toBe(4);
    expect(baris.product_unit_id).toBeNull();
    expect(typeof baris.quantity).toBe("number");
    expect(baris.quantity).toBe(2);
    expect(baris.price).toBe(15000.5);
    expect(baris.discount).toBe(500.25);
    // Perkalian baris menghasilkan angka, bukan penggabungan teks.
    expect(baris.quantity * baris.price).toBe(30001);
  });

  it("relasi produk yang tidak diikutkan menjadi undefined, product_unit null tetap null", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice: [item],
    });

    expect(m.sales_invoice![0].product).toBeUndefined();
    expect(m.sales_invoice![0].product_unit).toBeNull();
  });

  it("sales_invoice yang tidak dikirim menjadi larik kosong", () => {
    const { ...tanpa } = barisPrisma;
    const m = SalesInvoiceModel.fromMap(tanpa);
    expect(m.sales_invoice).toEqual([]);
  });

  /**
   * CACAT: isi sales_invoice bukan instance SalesInvoiceItemModel.
   *
   * fromMap membangun objek literal, padahal berkas yang sama menyediakan
   * SalesInvoiceItemModel.fromMap yang melakukan pekerjaan persis sama.
   * Akibatnya baris faktur tidak memiliki satu pun method kelas itu, dan
   * pemeriksaan `instanceof` di kode pemanggil selalu gagal. Untuk JSON hasilnya
   * memang sama, jadi cacat ini hanya menggigit kode di sisi server.
   */
  it("CACAT: baris faktur berupa objek biasa, bukan SalesInvoiceItemModel", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice: [item],
    });

    expect(m.sales_invoice![0]).not.toBeInstanceOf(SalesInvoiceItemModel);
  });
});

describe("Larik bersarang sales_invoice_payment", () => {
  const bayar = {
    id: 9,
    date: new Date("2026-03-05T00:00:00.000Z"),
    payment_method_id: 2,
    value: desimal("1000.75"),
    payment_method: { id: 2, name: "BCA", description: "Transfer bank" },
  };

  it("larik kosong tetap kosong", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice_payment: [],
    });
    expect(m.sales_invoice_payment).toEqual([]);
  });

  it("satu anggota menjadi SalesInvoicePaymentModel dengan nilai number", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice_payment: [bayar],
    });

    const p = m.sales_invoice_payment![0];
    expect(p.id).toBe(9);
    expect(typeof p.value).toBe("number");
    expect(p.value).toBe(1000.75);
    expect(p.date).toBeInstanceOf(Date);
    expect(p.payment_method?.name).toBe("BCA");
    // Induknya diisi dari id faktur, bukan dari kolom baris pembayaran.
    expect(p.sales_invoice_code_id).toBe(11);
  });

  /**
   * CACAT: sales_invoice_payment yang tidak diikutkan menghilang dari balasan,
   * sedangkan sales_invoice pada model yang sama menjadi larik kosong.
   *
   * Dua larik bersarang di satu fromMap memakai nilai bawaan berbeda: yang satu
   * [], yang satu undefined. Kunci bernilai undefined dibuang JSON.stringify,
   * jadi balasan untuk daftar faktur (yang biasanya tidak menyertakan relasi
   * pembayaran) sama sekali tidak memuat kunci sales_invoice_payment. Frontend
   * yang langsung memanggil `invoice.sales_invoice_payment.length` akan gagal
   * dengan TypeError, padahal pada faktur lain bidang itu ada.
   */
  it("CACAT: sales_invoice_payment yang tidak dikirim hilang, bukan menjadi []", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(m.sales_invoice_payment).toBeUndefined();
    expect(m.sales_invoice).toEqual([]); // pasangannya justru []
    expect(JSON.stringify(m)).not.toContain("sales_invoice_payment");
  });

  /**
   * CACAT: pembayaran dengan payment_method_id terisi tetapi relasinya tidak
   * di-include membuat fromMap melempar TypeError.
   *
   * Kodenya hanya memeriksa `x.payment_method_id == null` lalu langsung membaca
   * `x.payment_method.name`. Padahal id metode bayar selalu ada di baris
   * pembayaran, sementara relasi payment_method hanya ikut bila query memakai
   * include. Query yang lupa menyertakannya membuat seluruh permintaan gagal
   * dengan 500 — faktur tidak bisa dibuka sama sekali, bukan sekadar kehilangan
   * nama metode bayarnya.
   */
  it("CACAT: relasi payment_method yang tidak di-include membuat fromMap melempar TypeError", () => {
    const { payment_method, ...tanpaRelasi } = bayar;

    expect(() =>
      SalesInvoiceModel.fromMap({
        ...barisPrisma,
        sales_invoice_payment: [tanpaRelasi],
      })
    ).toThrow(TypeError);
  });

  /**
   * CACAT: pembayaran tanpa metode bayar (payment_method_id null) dilaporkan
   * sebagai "Cash".
   *
   * fromMap memang mengirim null, tetapi konstruktor SalesInvoicePaymentModel
   * menimpanya dengan PaymentMethodViewModel.fromMap(null), dan fungsi itu
   * mengembalikan objek bawaan bernama "Cash" untuk null maupun undefined.
   *
   * Akibatnya data yang sebenarnya KOSONG ditampilkan sebagai pembayaran tunai
   * yang pasti. Rekap kas harian ikut menghitungnya sebagai uang tunai yang
   * seharusnya ada di laci, sehingga selisih kas tidak pernah ketahuan dari
   * layar ini.
   */
  it("CACAT: payment_method_id null menjadi metode bayar 'Cash' palsu", () => {
    const m = SalesInvoiceModel.fromMap({
      ...barisPrisma,
      sales_invoice_payment: [{ ...bayar, payment_method_id: null }],
    });

    const p = m.sales_invoice_payment![0];
    expect(p.payment_method_id).toBeNull();
    expect(p.payment_method).not.toBeNull();
    expect(p.payment_method?.name).toBe("Cash");
    expect(p.payment_method?.id).toBeNull();
  });
});

describe("Bidang yang tidak diteruskan fromMap", () => {
  /**
   * CACAT: payment_term selalu null.
   *
   * Bidangnya dideklarasikan dengan nilai awal `= null`, konstruktor tidak
   * pernah menugasinya, dan fromMap tidak pernah mengirimnya — walau kolomnya
   * ada di baris basis data. Jadi tempo pembayaran yang dicatat operator tidak
   * pernah sampai ke frontend: jatuh tempo faktur tampil kosong di layar dan
   * pengingat penagihan tidak bisa dihitung dari balasan ini.
   */
  it("CACAT: payment_term dari basis data diabaikan, hasilnya selalu null", () => {
    const m = SalesInvoiceModel.fromMap({ ...barisPrisma, payment_term: 30 });
    expect(m.payment_term).toBeNull();
  });

  it("relasi yang tidak diikutkan tetap undefined", () => {
    const m = SalesInvoiceModel.fromMap(barisPrisma);

    expect(m.customer).toBeUndefined();
    expect(m.user_bill_code_created_byTouser).toBeUndefined();
    expect(m.user_bill_code_confirmed_byTouser).toBeUndefined();
  });

  /**
   * CACAT: customer yang memang null berubah menjadi undefined dan hilang dari
   * balasan.
   *
   * Penjagaannya ditulis `data.customer == undefined ? undefined : data.customer
   * == null ? null : ...` dengan perbandingan longgar. Di JavaScript
   * `null == undefined` bernilai benar, jadi cabang pertama sudah menangkap
   * null lebih dulu dan cabang kedua tidak pernah tercapai — kode mati.
   *
   * Akibatnya faktur penjualan tanpa pelanggan terdaftar (penjualan langsung di
   * kasir) dikirim TANPA kunci customer sama sekali. Frontend tidak bisa
   * membedakan "faktur ini memang tanpa pelanggan" dari "relasi pelanggan belum
   * dimuat", sehingga tidak tahu apakah perlu memuat ulang datanya.
   */
  it("CACAT: customer null berubah menjadi undefined dan kuncinya lenyap", () => {
    const m = SalesInvoiceModel.fromMap({ ...barisPrisma, customer: null });

    expect(m.customer).toBeUndefined();
    expect(m.customer).not.toBeNull();
    expect(JSON.stringify(m)).not.toContain('"customer":');
  });

  it("customer yang diikutkan menjadi CustomerModel", () => {
    const m = SalesInvoiceModel.fromMap({
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
});

describe("SalesInvoiceItemModel.fromMap", () => {
  const baris = {
    id: 3,
    product_id: 4,
    product_unit_id: 6,
    quantity: desimal("3"),
    price: desimal("999.99"),
    discount: "0.01",
    product_unit: {
      id: 6,
      product_id: 4,
      unit: "DUS",
      conversion: desimal("12"),
      sales_price: desimal("999.99"),
      sales_discount: desimal("0"),
      purchase_price: desimal("900"),
      purchase_discount: desimal("0"),
    },
  };

  it("menyalin bidang dan mengubah seluruh nilai uang menjadi number", () => {
    const m = SalesInvoiceItemModel.fromMap(baris);

    expect(m).toBeInstanceOf(SalesInvoiceItemModel);
    expect(m.id).toBe(3);
    expect(m.product_id).toBe(4);
    expect(m.product_unit_id).toBe(6);
    expect(m.quantity).toBe(3);
    expect(m.price).toBe(999.99);
    expect(m.discount).toBe(0.01);
    expect(typeof m.discount).toBe("number");
  });

  it("menerjemahkan relasi product_unit menjadi ProductUnitModel", () => {
    const m = SalesInvoiceItemModel.fromMap(baris);

    expect(m.product_unit?.unit).toBe("DUS");
    expect(m.product_unit?.conversion).toBe(12);
    expect(typeof m.product_unit?.sales_price).toBe("number");
  });

  it("product_unit null tetap null", () => {
    expect(
      SalesInvoiceItemModel.fromMap({ ...baris, product_unit: null })
        .product_unit
    ).toBeNull();
  });

  /**
   * CACAT: relasi product_unit yang tidak dimuat dilaporkan sebagai null.
   *
   * Urutan penjagaannya `data.product_unit == null ? null : data.product_unit ==
   * undefined ? undefined : ...`, memakai perbandingan longgar. Karena
   * `undefined == null` bernilai benar, cabang pertama menangkap undefined juga
   * dan cabang undefined menjadi kode mati.
   *
   * Akibatnya query yang tidak menyertakan relasi satuan produk mengirim
   * `product_unit: null`, yang dibaca frontend sebagai "barang ini memang tanpa
   * satuan" lalu menampilkan harga per satuan dasar. Jumlah yang tampil di
   * layar bisa berbeda kelipatan konversi (misalnya per pcs, bukan per dus)
   * dari yang sebenarnya ditagihkan.
   */
  it("CACAT: product_unit yang tidak dikirim menjadi null, bukan undefined", () => {
    const { product_unit, ...tanpa } = baris;
    const m = SalesInvoiceItemModel.fromMap(tanpa);

    expect(m.product_unit).toBeNull();
    expect(m.product_unit).not.toBeUndefined();
  });

  /**
   * CACAT: baris faktur tanpa kolom uang menjadi NaN.
   *
   * Sama seperti pada induknya, Number(undefined) menghasilkan NaN. Satu baris
   * yang cacat membuat total faktur ikut NaN, sehingga nominal seluruh faktur
   * tampil kosong di layar pelanggan.
   */
  it("CACAT: price yang tidak dikirim menjadi NaN", () => {
    const { price, ...tanpa } = baris;
    expect(Number.isNaN(SalesInvoiceItemModel.fromMap(tanpa).price)).toBe(true);
  });
});
