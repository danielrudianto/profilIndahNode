import { Prisma } from "@prisma/client";
import GoodReceiptModel from "../../src/models/good-receipt.model";
import { CompanyModel } from "../../src/models/company.model";
import SupplierModel from "../../src/models/supplier.model";
import { ProductModel } from "../../src/models/product.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku GoodReceiptModel.
 *
 * Model ini menerjemahkan satu baris good_receipt_code beserta seluruh
 * relasinya menjadi badan balasan HTTP. Ia adalah model terbesar di bagian ini:
 * ada larik barang bersarang, dua relasi pengguna, relasi perusahaan, dan
 * relasi pemasok — masing-masing dengan pola penjagaan yang berbeda-beda.
 *
 * Tiga sumber masalah yang berulang di berkas ini:
 *
 *   Bidang angka dari MySQL datang sebagai Prisma.Decimal, bukan number.
 *   Yang dibungkus Number() menjadi angka biasa; yang tidak dibungkus tetap
 *   Decimal dan berubah menjadi TEKS saat diserialkan ke JSON.
 *
 *   Perbandingan `== undefined` (dua sama dengan) juga bernilai benar untuk
 *   null. Akibatnya cabang `== null` yang ditulis sesudahnya tidak pernah
 *   tercapai — relasi yang bernilai null hilang dari balasan, bukan menjadi
 *   null yang eksplisit.
 *
 *   Kolom boolean diteruskan apa adanya tanpa penerjemahan sama sekali,
 *   walaupun bidangnya diketik `boolean`.
 */

const barisPrisma = {
  id: 12,
  uuid: "8f0c1d2e-0000-4000-8000-000000000001",
  name: "GR/2026/001",
  invoice_name: "INV-778",
  faktur: "010.000-26.00000001",
  discount: new Prisma.Decimal("15000.50"),
  date: new Date("2026-03-10T00:00:00.000Z"),
  supplier_id: 4,
  company_id: 2,
  created_by: 7,
  created_at: new Date("2026-03-10T02:30:00.000Z"),
  is_confirm: true,
  is_delete: false,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang identitas dan nomor dokumen", () => {
    const m = GoodReceiptModel.fromMap(barisPrisma);

    expect(m.id).toBe(12);
    expect(m.uuid).toBe("8f0c1d2e-0000-4000-8000-000000000001");
    expect(m.name).toBe("GR/2026/001");
    expect(m.invoice_name).toBe("INV-778");
    expect(m.faktur).toBe("010.000-26.00000001");
  });

  it("menyalin kunci relasi dan jejak pembuatan", () => {
    const m = GoodReceiptModel.fromMap(barisPrisma);

    expect(m.supplier_id).toBe(4);
    expect(m.company_id).toBe(2);
    expect(m.created_by).toBe(7);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at?.toISOString()).toBe("2026-03-10T02:30:00.000Z");
  });

  it("faktur boleh null karena tidak semua penerimaan barang berfaktur", () => {
    expect(
      GoodReceiptModel.fromMap({ ...barisPrisma, faktur: null }).faktur
    ).toBeNull();
  });

  it("menghasilkan instance GoodReceiptModel, bukan objek biasa", () => {
    expect(GoodReceiptModel.fromMap(barisPrisma)).toBeInstanceOf(
      GoodReceiptModel
    );
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan Date apa adanya bila basis data memang mengirim Date", () => {
    const m = GoodReceiptModel.fromMap(barisPrisma);
    expect(m.date).toBeInstanceOf(Date);
  });

  /**
   * CACAT: `date` diteruskan mentah, tidak pernah dibungkus new Date().
   *
   * Berbeda dengan created_at pada model lain yang selalu dibungkus, di sini
   * fromMap hanya menyalin nilainya. Bila sumbernya bukan Prisma — misalnya
   * hasil kueri mentah `$queryRaw`, atau badan permintaan dari klien — maka
   * yang masuk adalah TEKS, dan teks itu ikut tersimpan di objek walaupun
   * bidangnya diketik `Date`.
   *
   * Akibatnya bagi pemakai: kode lain yang memanggil `.getTime()` atau
   * membandingkan dua tanggal penerimaan barang akan gagal atau memberi hasil
   * salah, padahal TypeScript menjanjikan bidang ini pasti Date.
   */
  it("CACAT: date berupa teks tetap teks, tidak berubah menjadi Date", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      date: "2026-03-10",
    });

    expect(m.date).not.toBeInstanceOf(Date);
    expect(typeof m.date).toBe("string");
  });

  /**
   * CACAT: tanggal yang tidak dikirim menjadi undefined, bukan galat.
   *
   * `date` diketik wajib (`date: Date`) namun tidak ada penjagaan apa pun.
   * Baris tanpa tanggal menghasilkan objek yang kehilangan kunci `date` di
   * JSON, sehingga frontend menampilkan kolom tanggal kosong tanpa tahu
   * apakah datanya memang belum diisi atau gagal termuat.
   */
  it("CACAT: date yang hilang membuat kuncinya lenyap dari JSON", () => {
    const { date, ...tanpa } = barisPrisma;
    const m = GoodReceiptModel.fromMap(tanpa);

    expect(m.date).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('"date"');
  });
});

describe("Penanganan kolom boolean", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      is_confirm: true,
      is_delete: false,
    });

    expect(m.is_confirm).toBe(true);
    expect(m.is_delete).toBe(false);
  });

  /**
   * CACAT: is_confirm dan is_delete tidak pernah diterjemahkan.
   *
   * Model lain di repo ini setidaknya menangani teks "1" lewat percabangan di
   * konstruktor. GoodReceiptModel tidak: nilainya disalin mentah-mentah.
   *
   * MySQL menyimpan kolom ini sebagai TinyInt, dan pada jalur kueri mentah ia
   * kembali sebagai ANGKA 1/0 atau TEKS "1"/"0". Nilai itu ikut terkirim ke
   * frontend apa adanya, walaupun bidangnya diketik `boolean`.
   *
   * Akibat terburuknya ada pada teks "0": di JavaScript teks "0" bernilai
   * benar, jadi frontend yang menulis `if (data.is_delete)` menganggap
   * dokumen yang MASIH AKTIF sebagai dokumen terhapus, lalu menyembunyikannya
   * dari daftar. Sebaliknya `is_confirm` bernilai angka 1 gagal pada
   * perbandingan ketat `=== true` sehingga tombol konfirmasi tetap muncul
   * untuk dokumen yang sudah dikonfirmasi.
   */
  it("CACAT: angka 1/0 dari TinyInt lolos sebagai angka, bukan boolean", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      is_confirm: 1,
      is_delete: 0,
    });

    expect(m.is_confirm).toBe(1 as unknown as boolean);
    expect(m.is_delete).toBe(0 as unknown as boolean);
    expect(typeof m.is_confirm).toBe("number");
  });

  it('CACAT: teks "0" lolos sebagai teks yang justru bernilai benar', () => {
    const m = GoodReceiptModel.fromMap({ ...barisPrisma, is_delete: "0" });

    expect(m.is_delete).toBe("0" as unknown as boolean);
    // Inilah yang membuat dokumen aktif dikira terhapus di sisi frontend.
    expect(Boolean(m.is_delete)).toBe(true);
  });

  it("bidang boolean yang tidak dikirim hilang dari JSON", () => {
    const { is_confirm, is_delete, ...tanpa } = barisPrisma;
    const m = GoodReceiptModel.fromMap(tanpa);

    expect(m.is_confirm).toBeUndefined();
    expect(m.is_delete).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("is_confirm");
  });
});

describe("Bidang angka", () => {
  /**
   * CACAT: `discount` tingkat atas tidak dibungkus Number().
   *
   * Bandingkan dengan diskon pada tiap barang di dalam `good_receipt` yang
   * dibungkus `Number(item.discount)`. Diskon dokumen tidak.
   *
   * Kolom ini bertipe Decimal di basis data, jadi Prisma mengembalikan objek
   * Prisma.Decimal. Objek itu punya toJSON yang menghasilkan TEKS, sehingga
   * frontend menerima `"discount": "15000.5"` — sebuah string — padahal
   * bidangnya diketik `number`. Perhitungan di sisi klien seperti
   * `total - discount` menghasilkan penggabungan teks, bukan pengurangan.
   */
  it("CACAT: discount dokumen tetap Prisma.Decimal dan menjadi teks di JSON", () => {
    const m = GoodReceiptModel.fromMap(barisPrisma);

    expect(m.discount).toBeInstanceOf(Prisma.Decimal);
    expect(typeof m.discount).not.toBe("number");
    expect(JSON.parse(JSON.stringify(m)).discount).toBe("15000.5");
  });
});

describe("Larik barang bersarang (good_receipt)", () => {
  const denganBarang = {
    ...barisPrisma,
    good_receipt: [
      {
        id: 101,
        product_id: 55,
        product_unit_id: 66,
        quantity: new Prisma.Decimal("12"),
        price: "250000",
        discount: new Prisma.Decimal("1000"),
        product: {
          id: 55,
          reference: "PRF-001",
          description: "Besi Hollow",
          unit: "BATANG",
          product_brand_id: 1,
          product_type_id: 2,
        },
        product_unit: {
          id: 66,
          product_id: 55,
          unit: "BATANG",
          conversion: new Prisma.Decimal("1"),
          sales_price: "260000",
          sales_discount: "0",
          purchase_price: "250000",
          purchase_discount: "0",
        },
      },
    ],
  };

  it("mengubah quantity, price, dan discount barang menjadi angka biasa", () => {
    const m = GoodReceiptModel.fromMap(denganBarang);
    const item = m.good_receipt![0];

    expect(item.quantity).toBe(12);
    expect(item.price).toBe(250000);
    expect(item.discount).toBe(1000);
    expect(typeof item.quantity).toBe("number");
  });

  it("meneruskan kunci barang dan relasi produknya", () => {
    const m = GoodReceiptModel.fromMap(denganBarang);
    const item = m.good_receipt![0];

    expect(item.id).toBe(101);
    expect(item.product_id).toBe(55);
    expect(item.product_unit_id).toBe(66);
    expect(item.product).toBeInstanceOf(ProductModel);
    expect(item.product!.reference).toBe("PRF-001");
    expect(item.product_unit!.conversion).toBe(1);
  });

  it("larik kosong tetap larik kosong, bukan undefined", () => {
    const m = GoodReceiptModel.fromMap({ ...barisPrisma, good_receipt: [] });
    expect(m.good_receipt).toEqual([]);
  });

  it("larik yang tidak dikirim tetap undefined (relasi tidak diminta)", () => {
    expect(GoodReceiptModel.fromMap(barisPrisma).good_receipt).toBeUndefined();
  });

  it("larik null diperlakukan sama dengan tidak dikirim", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      good_receipt: null,
    });
    expect(m.good_receipt).toBeUndefined();
  });

  /**
   * CACAT: diskon barang yang tidak dikirim menjadi NaN, lalu null di JSON.
   *
   * `Number(undefined)` menghasilkan NaN, dan JSON.stringify mengubah NaN
   * menjadi null. Frontend menerima `"discount": null` untuk sebuah bidang
   * yang diketik `number` wajib. Bila nilai itu dipakai menghitung subtotal
   * barang, hasilnya ikut menjadi null atau NaN — nota mencetak angka kosong
   * tanpa ada galat di sisi server.
   *
   * Berlaku sama untuk quantity dan price.
   */
  it("CACAT: quantity/price/discount yang hilang menjadi NaN dan tersaji null", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      good_receipt: [{ id: 1, product_id: 2, product_unit_id: 3 }],
    });
    const item = m.good_receipt![0];

    expect(Number.isNaN(item.quantity)).toBe(true);
    expect(Number.isNaN(item.price)).toBe(true);
    expect(Number.isNaN(item.discount)).toBe(true);

    const disajikan = JSON.parse(JSON.stringify(m)).good_receipt[0];
    expect(disajikan.quantity).toBeNull();
    expect(disajikan.price).toBeNull();
  });

  it("produk yang tidak disertakan membuat item.product undefined, bukan galat", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      good_receipt: [
        { id: 1, product_id: 2, product_unit_id: 3, quantity: 1, price: 1 },
      ],
    });

    expect(m.good_receipt![0].product).toBeUndefined();
  });

  /**
   * CACAT: cabang `== null` pada product_unit adalah kode mati.
   *
   * Urutannya: `item.product_unit == undefined ? undefined : item.product_unit
   * == null ? null : ...`. Di JavaScript `null == undefined` bernilai BENAR,
   * jadi nilai null sudah tertangkap cabang pertama. Cabang null di bawahnya
   * tidak akan pernah tercapai.
   *
   * Akibatnya barang dengan satuan yang sengaja dikosongkan (product_unit
   * null di basis data — sah untuk barang bersatuan dasar) kehilangan kunci
   * `product_unit` sama sekali di JSON, bukan mendapat null. Frontend tidak
   * bisa membedakan "satuan memang kosong" dari "relasi satuan tidak ikut
   * dimuat oleh kueri", sehingga penulisan kolom satuan di layar rawan salah.
   */
  it("CACAT: product_unit null menjadi undefined dan kuncinya hilang dari JSON", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      good_receipt: [
        {
          id: 1,
          product_id: 2,
          product_unit_id: null,
          quantity: 1,
          price: 1,
          discount: 0,
          product_unit: null,
        },
      ],
    });

    expect(m.good_receipt![0].product_unit).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('product_unit":');
  });
});

describe("Relasi perusahaan dan pemasok", () => {
  const barisCompany = {
    id: 2,
    name: "PT Profil Indah",
    address: "Jl. Industri 1",
    npwp: "998877665544332",
    created_by: 1,
    created_at: new Date("2020-01-01T00:00:00.000Z"),
    is_delete: false,
  };

  it("perusahaan yang tidak dikirim tetap undefined", () => {
    expect(GoodReceiptModel.fromMap(barisPrisma).company).toBeUndefined();
    expect(GoodReceiptModel.fromMap(barisPrisma).supplier).toBeUndefined();
  });

  it("perusahaan yang dikirim menjadi instance CompanyModel", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      company: barisCompany,
    });

    expect(m.company).toBeInstanceOf(CompanyModel);
    expect(m.company!.name).toBe("PT Profil Indah");
    expect(m.company!.id).toBe(2);
  });

  /**
   * CACAT: perusahaan dibentuk dengan `new CompanyModel(...)`, bukan fromMap.
   *
   * Konstruktor CompanyModel menimpa created_at dengan `new Date()` tanpa
   * syarat — ia dirancang untuk baris BARU, bukan untuk baris yang dibaca dari
   * basis data. Karena fromMap memanggil konstruktor secara langsung, tanggal
   * pendirian perusahaan yang ikut menempel pada penerimaan barang selalu
   * menjadi "sekarang".
   *
   * Akibatnya bagi pemakai: setiap balasan menampilkan created_at perusahaan
   * yang berbeda-beda mengikuti jam permintaan. Data cache di frontend tidak
   * pernah dianggap sama, dan laporan apa pun yang mengurutkan berdasarkan
   * tanggal ini menghasilkan urutan acak.
   */
  it("created_at perusahaan berasal dari baris, bukan jam permintaan", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      company: barisCompany,
    });

    expect(m.company!.created_at!.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z"
    );
  });

  /**
   * CACAT: pemasok juga dibentuk lewat konstruktor, bukan SupplierModel.fromMap.
   *
   * SupplierModel.fromMap menerjemahkan `can_delete` dari teks "1" menjadi
   * boolean dan mengubah relasi user menjadi UserViewModel. Konstruktornya
   * tidak melakukan keduanya: can_delete disalin mentah dan `user` bahkan
   * tidak pernah ditugasi.
   *
   * Akibatnya bagi pemakai: pada layar penerimaan barang, data pemasok yang
   * menempel berbeda bentuk dari data pemasok yang sama di layar master
   * pemasok — can_delete berupa teks "1" alih-alih true. Frontend yang
   * memakai perbandingan ketat memperlakukan keduanya berbeda tanpa alasan
   * yang terlihat.
   */
  it("CACAT: can_delete pemasok tidak diterjemahkan menjadi boolean", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      supplier: {
        id: 4,
        name: "CV Baja Utama",
        address: "Jl. Baja 9",
        npwp: null,
        created_by: 1,
        created_at: new Date("2024-01-01"),
        can_delete: "1",
      },
    });

    expect(m.supplier).toBeInstanceOf(SupplierModel);
    expect(m.supplier!.can_delete).toBe("1" as unknown as boolean);
    expect(m.supplier!.can_delete).not.toBe(true);
  });

  it("relasi user pemasok tidak pernah ikut karena konstruktornya tidak menugasinya", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      supplier: {
        id: 4,
        name: "CV Baja Utama",
        user: { id: 1, name: "Admin", username: "admin", role: 5 },
      },
    });

    expect(m.supplier!.user).toBeUndefined();
  });
});

describe("Relasi pengguna pembuat dan pengonfirmasi", () => {
  const barisUser = { id: 7, name: "Rina", username: "rina", role: 1 };

  it("pengguna pembuat menjadi UserViewModel", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      user_good_receipt_code_created_byTouser: barisUser,
    });

    expect(m.user_good_receipt_code_created_byTouser).toBeInstanceOf(
      UserViewModel
    );
    expect(m.user_good_receipt_code_created_byTouser!.name).toBe("Rina");
  });

  it("relasi pengguna yang tidak diminta tetap undefined", () => {
    const m = GoodReceiptModel.fromMap(barisPrisma);
    expect(m.user_good_receipt_code_created_byTouser).toBeUndefined();
    expect(m.user_good_receipt_code_confirmed_byTouser).toBeUndefined();
  });

  /**
   * CACAT: pengonfirmasi bernilai null juga menjadi undefined.
   *
   * Sama seperti product_unit di atas: `== undefined` sudah menangkap null,
   * jadi cabang yang mengembalikan null adalah kode mati. Bidangnya bahkan
   * diketik `UserViewModel | null` — nilai null itu memang diharapkan ada,
   * tetapi tidak pernah bisa muncul.
   *
   * Akibatnya frontend tidak punya cara membedakan dokumen yang BELUM
   * dikonfirmasi (relasi null di basis data) dari dokumen yang relasinya
   * memang tidak diminta pada kueri daftar.
   */
  it("CACAT: pengonfirmasi null menjadi undefined, bukan null", () => {
    const m = GoodReceiptModel.fromMap({
      ...barisPrisma,
      user_good_receipt_code_confirmed_byTouser: null,
    });

    expect(m.user_good_receipt_code_confirmed_byTouser).toBeUndefined();
    expect(m.user_good_receipt_code_confirmed_byTouser).not.toBeNull();
  });
});

/**
 * CACAT: confirmed_by dan confirmed_at tidak pernah sampai ke klien.
 *
 * Keduanya ada di kelas dan di antarmuka IGoodReceipt, tetapi terputus dua
 * kali: fromMap tidak meneruskannya, DAN konstruktornya tidak menugasinya.
 * Jadi meskipun fromMap diperbaiki, nilainya tetap hilang.
 *
 * Akibatnya bagi pemakai: layar penerimaan barang tidak pernah bisa
 * menampilkan siapa yang mengonfirmasi dan kapan. Satu-satunya petunjuk
 * tersisa adalah is_confirm yang hanya bernilai ya/tidak, sehingga jejak audit
 * penerimaan barang tidak lengkap. Kuncinya bahkan tidak ada di JSON, jadi
 * frontend tidak mendapat isyarat apa pun bahwa datanya ada di basis data.
 */
describe("Bidang yang tidak diteruskan fromMap maupun konstruktor", () => {
  const lengkap = {
    ...barisPrisma,
    confirmed_by: 9,
    confirmed_at: new Date("2026-03-11T00:00:00.000Z"),
  };

  it.each(["confirmed_by", "confirmed_at"])(
    "CACAT: %s hilang walau ada di baris basis data",
    (bidang) => {
      const m = GoodReceiptModel.fromMap(lengkap) as unknown as Record<
        string,
        unknown
      >;

      expect(m[bidang]).toBeUndefined();
      expect(bidang in m).toBe(false);
    }
  );

  it("CACAT: kuncinya benar-benar tidak ada saat diserialkan", () => {
    expect(JSON.stringify(GoodReceiptModel.fromMap(lengkap))).not.toContain(
      "confirmed_"
    );
  });
});
