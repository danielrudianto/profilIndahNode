import { Prisma } from "@prisma/client";

import {
  ProductModel,
  ProductStockModel,
} from "../../src/models/product.model";
import { ProductBrandViewModel } from "../../src/models/product-brand.model";
import { ProductTypeViewModel } from "../../src/models/product-type.model";
import {
  ProductUnitModel,
  ProductUnitViewModel,
} from "../../src/models/product-unit.model";

/**
 * Perilaku ProductModel.
 *
 * Produk adalah model paling ramai di repo ini: ia membawa harga jual, harga
 * beli, diskon, stok minimum, tiga relasi bersarang, dan dua kolom boolean.
 * Semuanya diterjemahkan oleh `fromMap` yang menerima `any`, jadi TypeScript
 * tidak menjaga apa pun — kesalahan baru terlihat sebagai bidang yang hilang
 * atau angka aneh di layar pengguna.
 *
 * Tiga sumber masalah yang dikunci berkas ini:
 *
 *   Angka dibungkus Number() tanpa penjagaan. Kolom yang tidak ikut di-select
 *   Prisma menjadi NaN, dan NaN berubah menjadi null saat diserialkan.
 *
 *   Kolom boolean diteruskan mentah tanpa penerjemahan sama sekali, padahal
 *   MySQL mengirim TinyInt sebagai angka dan driver lama sebagai teks.
 *
 *   `can_delete` ada di konstruktor tetapi tidak pernah diisi fromMap.
 */

const barisPrisma = {
  id: 12,
  reference: "PRD-001",
  description: "Besi Beton 10mm",
  product_brand_id: 2,
  product_type_id: 3,
  created_by: 5,
  created_at: new Date("2026-01-10T00:00:00.000Z"),
  updated_by: 6,
  updated_at: new Date("2026-02-11T00:00:00.000Z"),
  minimum_stock: 10,
  unit: "BATANG",
  sales_price: "15000.50",
  sales_discount: "0",
  purchase_price: "12000",
  purchase_discount: "0",
  is_active: true,
  is_delete: false,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin bidang identitas satu per satu", () => {
    const m = ProductModel.fromMap(barisPrisma);

    expect(m.id).toBe(12);
    expect(m.reference).toBe("PRD-001");
    expect(m.description).toBe("Besi Beton 10mm");
    expect(m.product_brand_id).toBe(2);
    expect(m.product_type_id).toBe(3);
    expect(m.unit).toBe("BATANG");
  });

  it("menyalin jejak pembuatan dan perubahan", () => {
    const m = ProductModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(5);
    expect(m.updated_by).toBe(6);
    // Berbeda dengan CustomerModel, tanggal di sini TIDAK dibungkus new Date().
    // Objek Date dari Prisma diteruskan apa adanya — aman selama sumbernya
    // memang Prisma, tetapi tidak menormalkan teks tanggal dari sumber lain.
    expect(m.created_at).toBe(barisPrisma.created_at);
    expect(m.updated_at).toBe(barisPrisma.updated_at);
  });

  it("menghasilkan instance ProductModel, bukan objek biasa", () => {
    expect(ProductModel.fromMap(barisPrisma)).toBeInstanceOf(ProductModel);
  });
});

describe("Bidang angka: harga, diskon, dan stok minimum", () => {
  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = ProductModel.fromMap({
      ...barisPrisma,
      sales_price: new Prisma.Decimal("15000.75"),
      purchase_price: new Prisma.Decimal("12000.25"),
    });

    expect(typeof m.sales_price).toBe("number");
    expect(m.sales_price).toBe(15000.75);
    expect(m.purchase_price).toBe(12000.25);
  });

  it("mengubah teks desimal dari basis data menjadi angka", () => {
    const m = ProductModel.fromMap(barisPrisma);

    expect(m.sales_price).toBe(15000.5);
    expect(m.sales_discount).toBe(0);
    expect(m.purchase_price).toBe(12000);
    expect(m.purchase_discount).toBe(0);
    expect(m.minimum_stock).toBe(10);
  });

  /**
   * CACAT: kolom angka yang tidak ikut di-select menjadi NaN, lalu null.
   *
   * fromMap membungkus kelima kolom angka dengan Number() tanpa memeriksa
   * apakah nilainya ada. `Number(undefined)` menghasilkan NaN, dan NaN
   * berubah menjadi null saat JSON.stringify.
   *
   * Akibatnya bagi pengguna: query yang memakai `select` sebagian (mis. daftar
   * produk ringkas untuk dropdown) mengirim harga bernilai null ke frontend.
   * Kalau frontend menghitung total dengan nilai itu, hasilnya NaN atau nol —
   * nota bisa tercetak dengan harga 0 tanpa ada galat sama sekali.
   */
  it("CACAT: harga yang tidak dikirim menjadi NaN dan diserialkan sebagai null", () => {
    const m = ProductModel.fromMap({ id: 12, reference: "PRD-001" });

    expect(m.sales_price).toBeNaN();
    expect(m.sales_discount).toBeNaN();
    expect(m.purchase_price).toBeNaN();
    expect(m.purchase_discount).toBeNaN();
    expect(m.minimum_stock).toBeNaN();

    const json = JSON.parse(JSON.stringify(m));
    expect(json.sales_price).toBeNull();
    expect(json.minimum_stock).toBeNull();
  });

  /**
   * CACAT: null di basis data menjadi 0, bukan null.
   *
   * `Number(null)` bernilai 0. Kolom diskon yang sengaja dikosongkan di basis
   * data tidak bisa lagi dibedakan dari diskon yang memang bernilai nol.
   */
  it("CACAT: harga null menjadi angka 0", () => {
    const m = ProductModel.fromMap({ ...barisPrisma, sales_discount: null });
    expect(m.sales_discount).toBe(0);
  });
});

describe("Penanganan kolom boolean is_active dan is_delete", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = ProductModel.fromMap({
      ...barisPrisma,
      is_active: true,
      is_delete: false,
    });

    expect(m.is_active).toBe(true);
    expect(m.is_delete).toBe(false);
  });

  it("membiarkan bidangnya undefined bila tidak dikirim", () => {
    const { is_active, is_delete, ...tanpa } = barisPrisma;
    const m = ProductModel.fromMap(tanpa);

    expect(m.is_active).toBeUndefined();
    expect(m.is_delete).toBeUndefined();
  });

  /**
   * CACAT: tidak ada penerjemahan boolean sama sekali.
   *
   * CustomerModel dan ProductBrandModel setidaknya mencoba menerjemahkan
   * boolean dan teks. ProductModel tidak: `is_active` dan `is_delete`
   * diteruskan persis seperti yang datang dari basis data.
   *
   * Akibatnya bagi pengguna: TinyInt MySQL yang sampai sebagai angka 1
   * membuat frontend yang membandingkan `is_active === true` selalu gagal —
   * produk aktif tampil sebagai nonaktif, atau saklar aktif/nonaktif di layar
   * tidak pernah menyala.
   */
  it("CACAT: angka 1 dan 0 diteruskan mentah, bukan menjadi boolean", () => {
    const satu = ProductModel.fromMap({ ...barisPrisma, is_active: 1 });
    const nol = ProductModel.fromMap({ ...barisPrisma, is_active: 0 });

    expect(satu.is_active).toBe(1);
    expect(nol.is_active).toBe(0);
    expect(typeof satu.is_active).toBe("number");
  });

  /**
   * CACAT: teks "0" diteruskan mentah dan bernilai TRUTHY.
   *
   * Ini varian yang paling berbahaya. Teks "0" adalah nilai truthy di
   * JavaScript, jadi pemeriksaan sesederhana `if (product.is_delete)` akan
   * menganggap SEMUA produk sudah terhapus — termasuk yang masih aktif.
   * Sebaliknya `is_active: "0"` membuat produk nonaktif tampak aktif dan bisa
   * ikut terjual.
   */
  it("CACAT: teks '0' diteruskan mentah sehingga bernilai truthy", () => {
    const m = ProductModel.fromMap({
      ...barisPrisma,
      is_delete: "0",
      is_active: "0",
    });

    expect(m.is_delete).toBe("0");
    expect(m.is_active).toBe("0");
    // Inilah akibatnya: nilai yang seharusnya "tidak" justru bernilai benar.
    expect(Boolean(m.is_delete)).toBe(true);
  });
});

describe("Bidang yang ada di konstruktor tetapi tidak diteruskan fromMap", () => {
  /**
   * CACAT: can_delete tidak pernah sampai ke klien.
   *
   * Konstruktor ProductModel menerima `can_delete` dan menugaskannya, tetapi
   * fromMap tidak pernah mengisinya — walaupun repository sudah repot-repot
   * menghitung apakah produk masih dipakai transaksi lain.
   *
   * Akibatnya bagi pengguna: bidangnya undefined, hilang dari JSON, dan tombol
   * hapus di frontend yang bergantung padanya tidak pernah muncul. Pengguna
   * tidak bisa menghapus produk yang sebenarnya boleh dihapus, tanpa ada pesan
   * galat apa pun yang menjelaskan.
   */
  it("CACAT: can_delete hilang walau tersedia di baris basis data", () => {
    const m = ProductModel.fromMap({ ...barisPrisma, can_delete: true });

    expect(m.can_delete).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("can_delete");
  });

  /**
   * CACAT: deleted_by dan deleted_at tidak pernah ditugasi di mana pun.
   *
   * Keduanya dideklarasikan sebagai bidang kelas dan ada di antarmuka IProduct,
   * tetapi konstruktornya melewatkan keduanya — jadi fromMap pun tidak bisa
   * menolong. Jejak penghapusan produk tidak pernah bisa ditampilkan ke
   * pengguna tanpa mengubah konstruktornya lebih dulu.
   */
  it.each(["deleted_by", "deleted_at"])(
    "CACAT: %s tidak pernah terisi walau ada di baris basis data",
    (bidang) => {
      const m = ProductModel.fromMap({
        ...barisPrisma,
        deleted_by: 9,
        deleted_at: new Date("2026-03-01"),
      }) as unknown as Record<string, unknown>;

      expect(m[bidang]).toBeUndefined();
    }
  );
});

describe("Relasi bersarang", () => {
  const denganRelasi = {
    ...barisPrisma,
    product_brand: { id: 2, name: "Krakatau", created_by: 5 },
    product_type: { id: 3, name: "Besi", created_by: 5 },
    product_unit: [
      {
        id: 41,
        product_id: 12,
        unit: "IKAT",
        conversion: "10",
        sales_price: "150000",
        sales_discount: "0",
        purchase_price: "120000",
        purchase_discount: "0",
      },
    ],
    product_stock: { id: 7, product_id: 12, stock: "250" },
  };

  it("memetakan product_brand menjadi tampilan ringkas berisi id dan nama saja", () => {
    const m = ProductModel.fromMap(denganRelasi);

    expect(m.product_brand).toBeInstanceOf(ProductBrandViewModel);
    expect(m.product_brand?.id).toBe(2);
    expect(m.product_brand?.name).toBe("Krakatau");
    // created_by sengaja tidak ikut pada bentuk ringkas.
    expect(Object.keys(m.product_brand as object)).toEqual(["id", "name"]);
  });

  it("memetakan product_type menjadi tampilan ringkas", () => {
    const m = ProductModel.fromMap(denganRelasi);

    expect(m.product_type).toBeInstanceOf(ProductTypeViewModel);
    expect(m.product_type?.id).toBe(3);
    expect(m.product_type?.name).toBe("Besi");
  });

  it("membiarkan relasi undefined bila tidak ikut di-include", () => {
    const m = ProductModel.fromMap(barisPrisma);

    expect(m.product_brand).toBeUndefined();
    expect(m.product_type).toBeUndefined();
    expect(m.product_stock).toBeUndefined();
  });

  it("memperlakukan relasi bernilai null sama dengan tidak ada", () => {
    // Pemeriksaannya memakai == longgar, jadi null ikut tertangkap.
    const m = ProductModel.fromMap({
      ...barisPrisma,
      product_brand: null,
      product_type: null,
    });

    expect(m.product_brand).toBeUndefined();
    expect(m.product_type).toBeUndefined();
  });

  it("memetakan daftar product_unit dan mengubah konversinya menjadi angka", () => {
    const m = ProductModel.fromMap(denganRelasi);

    expect(m.product_unit).toHaveLength(1);
    expect(m.product_unit?.[0].unit).toBe("IKAT");
    expect(m.product_unit?.[0].conversion).toBe(10);
    expect(m.product_unit?.[0].sales_price).toBe(150000);
  });

  it("memetakan product_stock menjadi angka", () => {
    const m = ProductModel.fromMap(denganRelasi);

    expect(m.product_stock).toBeInstanceOf(ProductStockModel);
    expect(m.product_stock?.stock).toBe(250);
  });

  /**
   * CACAT: elemen product_unit bukan instance kelasnya.
   *
   * ProductUnitViewModel.fromMap mengembalikan objek literal, bukan hasil
   * `new`. Karena itu setiap satuan produk pada balasan hanyalah objek biasa
   * yang kebetulan berbentuk mirip.
   *
   * Akibatnya bagi kode pemanggil: pemeriksaan instanceof gagal, dan method
   * apa pun yang kelak ditambahkan ke ProductUnitViewModel tidak akan tersedia
   * pada objek-objek ini. Cacatnya diam karena bentuk JSON-nya tetap benar.
   */
  it("CACAT: elemen product_unit bukan instance ProductUnitViewModel", () => {
    const m = ProductModel.fromMap(denganRelasi);

    expect(m.product_unit?.[0]).not.toBeInstanceOf(ProductUnitViewModel);
    expect(Object.getPrototypeOf(m.product_unit?.[0])).toBe(Object.prototype);
  });

  /**
   * CACAT: product_unit menjadi undefined, bukan daftar kosong.
   *
   * Bidangnya dideklarasikan dengan nilai bawaan `= []`, tetapi konstruktor
   * menimpanya dengan `data.product_unit` yang undefined, sehingga nilai
   * bawaannya tidak pernah berlaku.
   *
   * Akibatnya bagi frontend: kode yang percaya pada janji "selalu array" lalu
   * memanggil `product.product_unit.map(...)` akan melempar TypeError dan
   * merusak seluruh halaman, bukan sekadar menampilkan daftar kosong.
   */
  it("CACAT: product_unit yang tidak di-include menjadi undefined meski ada nilai bawaan []", () => {
    const m = ProductModel.fromMap(barisPrisma);

    expect(m.product_unit).toBeUndefined();
    expect(() =>
      (m.product_unit as ProductUnitModel[]).map((x) => x.id)
    ).toThrow(TypeError);
  });
});

describe("ProductStockModel", () => {
  it("mengubah product_id dan stock menjadi angka", () => {
    const s = ProductStockModel.fromMap({
      id: 7,
      product_id: "12",
      stock: "250.5",
    });

    expect(s).toBeInstanceOf(ProductStockModel);
    expect(s.id).toBe(7);
    expect(s.product_id).toBe(12);
    expect(s.stock).toBe(250.5);
  });

  /**
   * CACAT: stok yang tidak dikirim menjadi NaN, lalu null di JSON.
   *
   * Akibatnya bagi pengguna: layar stok menampilkan kosong atau NaN, dan
   * peringatan "stok di bawah minimum" tidak pernah menyala karena
   * perbandingan apa pun dengan NaN selalu bernilai salah.
   */
  it("CACAT: stok yang tidak dikirim menjadi NaN", () => {
    const s = ProductStockModel.fromMap({ id: 7 });

    expect(s.stock).toBeNaN();
    expect(s.product_id).toBeNaN();
    expect(JSON.parse(JSON.stringify(s)).stock).toBeNull();
  });
});

describe("fromMeilisearch", () => {
  const dokumen = {
    id: 12,
    reference: "PRD-001",
    description: "Besi Beton 10mm",
    product_brand_id: 2,
    product_type_id: 3,
    unit: "BATANG",
    minimum_stock: 10,
    sales_price: "15000",
    sales_discount: "0",
    purchase_price: "12000",
    purchase_discount: "0",
    is_active: true,
    is_delete: false,
    product_brand: { id: 2, name: "Krakatau" },
    product_type: { id: 3, name: "Besi" },
    product_unit: [
      {
        id: 41,
        product_id: 12,
        unit: "IKAT",
        conversion: "10",
        sales_price: "150000",
        sales_discount: "0",
        purchase_price: "120000",
        purchase_discount: "0",
      },
    ],
  };

  it("membentuk model lengkap dari dokumen indeks pencarian", () => {
    const m = ProductModel.fromMeilisearch(dokumen);

    expect(m).toBeInstanceOf(ProductModel);
    expect(m.reference).toBe("PRD-001");
    expect(m.sales_price).toBe(15000);
    expect(m.product_brand?.name).toBe("Krakatau");
  });

  it("memakai ProductUnitModel penuh, bukan bentuk ringkas seperti fromMap", () => {
    const m = ProductModel.fromMeilisearch(dokumen);

    expect(m.product_unit?.[0]).toBeInstanceOf(ProductUnitModel);
    expect(m.product_unit?.[0].conversion).toBe(10);
  });

  it("memberi daftar kosong bila dokumen tidak punya product_unit", () => {
    const { product_unit, ...tanpa } = dokumen;
    expect(ProductModel.fromMeilisearch(tanpa).product_unit).toEqual([]);
  });

  /**
   * CACAT: dokumen tanpa product_brand atau product_type membuat fromMeilisearch
   * melempar TypeError.
   *
   * Berbeda dengan fromMap yang menjaga kedua relasi dengan pemeriksaan
   * undefined, fromMeilisearch memanggil ProductBrandViewModel.fromMap(...)
   * langsung. Bila dokumen lama di indeks belum punya bidang itu, pemanggilan
   * berakhir dengan "Cannot read properties of undefined".
   *
   * Akibatnya bagi pengguna: SATU dokumen usang di indeks Meilisearch cukup
   * untuk membuat seluruh hasil pencarian produk gagal dengan galat 500 —
   * bukan sekadar satu baris yang tampil tidak lengkap.
   */
  it("CACAT: dokumen tanpa product_brand melempar TypeError", () => {
    const { product_brand, ...tanpa } = dokumen;

    expect(() => ProductModel.fromMeilisearch(tanpa)).toThrow(TypeError);
  });
});
