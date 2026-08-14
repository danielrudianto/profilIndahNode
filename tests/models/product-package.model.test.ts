import { Prisma } from "@prisma/client";

import { PackageCodeModel } from "../../src/models/product-package.model";

/**
 * Perilaku PackageCodeModel.
 *
 * Paket adalah kumpulan produk yang dijual dengan satu harga. Modelnya
 * membawa daftar isi paket (`package_content`) beserta jumlah, harga, dan
 * diskon tiap barisnya — semuanya angka yang ikut dihitung saat nota dibuat.
 *
 * Yang membedakan model ini dari model lain di repo: fromMap TIDAK menjaga
 * `package_content` sama sekali sebelum memanggil .map(), sehingga baris paket
 * yang di-query tanpa include langsung membuat permintaan gagal, bukan sekadar
 * mengembalikan data tidak lengkap.
 */

const isiPaket = {
  id: 31,
  product_id: 12,
  product_unit_id: 41,
  quantity: "3",
  price: "150000",
  discount: "10",
  package_code_id: 8,
};

const barisPrisma = {
  id: 8,
  name: "Paket Renovasi",
  description: "Besi + semen",
  price: "1500000.50",
  created_by: 5,
  created_at: new Date("2026-01-12T00:00:00.000Z"),
  is_delete: false,
  package_content: [isiPaket],
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas satu per satu", () => {
    const m = PackageCodeModel.fromMap(barisPrisma);

    expect(m.id).toBe(8);
    expect(m.name).toBe("Paket Renovasi");
    expect(m.description).toBe("Besi + semen");
  });

  it("menyalin jejak pembuatan", () => {
    const m = PackageCodeModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(5);
    expect(m.created_at).toBe(barisPrisma.created_at);
  });

  it("menghasilkan instance PackageCodeModel, bukan objek biasa", () => {
    expect(PackageCodeModel.fromMap(barisPrisma)).toBeInstanceOf(
      PackageCodeModel
    );
  });

  it("meneruskan seluruh bidang konstruktor tanpa ada yang tertinggal", () => {
    const m = PackageCodeModel.fromMap(barisPrisma) as unknown as Record<
      string,
      unknown
    >;

    for (const bidang of [
      "id",
      "name",
      "description",
      "price",
      "created_by",
      "created_at",
      "is_delete",
      "package_content",
    ]) {
      expect(m[bidang]).toBeDefined();
    }
  });
});

describe("Bidang angka pada paket", () => {
  it("mengubah harga paket berbentuk teks menjadi angka", () => {
    expect(PackageCodeModel.fromMap(barisPrisma).price).toBe(1500000.5);
  });

  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = PackageCodeModel.fromMap({
      ...barisPrisma,
      price: new Prisma.Decimal("1750000.25"),
    });

    expect(typeof m.price).toBe("number");
    expect(m.price).toBe(1750000.25);
  });

  /**
   * CACAT: harga paket yang tidak ikut di-select menjadi NaN, lalu null.
   *
   * Akibatnya bagi pengguna: paket tampil tanpa harga di daftar, dan bila
   * frontend menjumlahkan harga paket ke total nota, totalnya ikut menjadi NaN
   * — nota tampil kosong padahal barangnya ada.
   */
  it("CACAT: harga yang tidak dikirim menjadi NaN", () => {
    const { price, ...tanpa } = barisPrisma;
    const m = PackageCodeModel.fromMap(tanpa);

    expect(m.price).toBeNaN();
    expect(JSON.parse(JSON.stringify(m)).price).toBeNull();
  });
});

describe("Daftar isi paket (package_content)", () => {
  it("menyalin identitas tiap baris isi", () => {
    const isi = PackageCodeModel.fromMap(barisPrisma).package_content!;

    expect(isi).toHaveLength(1);
    expect(isi[0].id).toBe(31);
    expect(isi[0].product_id).toBe(12);
    expect(isi[0].product_unit_id).toBe(41);
    expect(isi[0].package_code_id).toBe(8);
  });

  it("mengubah jumlah, harga, dan diskon tiap baris menjadi angka", () => {
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [
        { ...isiPaket, quantity: new Prisma.Decimal("2.5"), price: "99000" },
      ],
    }).package_content!;

    expect(isi[0].quantity).toBe(2.5);
    expect(isi[0].price).toBe(99000);
    expect(isi[0].discount).toBe(10);
    expect(typeof isi[0].quantity).toBe("number");
  });

  it("menjaga product_unit_id bernilai null tetap null", () => {
    // null di sini berarti "dijual dalam satuan dasar produk", jadi tidak boleh
    // berubah menjadi 0 atau undefined.
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [{ ...isiPaket, product_unit_id: null }],
    }).package_content!;

    expect(isi[0].product_unit_id).toBeNull();
  });

  it("menerima daftar isi kosong", () => {
    const m = PackageCodeModel.fromMap({ ...barisPrisma, package_content: [] });
    expect(m.package_content).toEqual([]);
  });

  /**
   * CACAT: jumlah dan harga baris isi yang tidak dikirim menjadi NaN.
   *
   * Akibatnya bagi pengguna: satu baris isi yang tidak lengkap cukup untuk
   * membuat total paket menjadi NaN, karena NaN menular ke setiap penjumlahan
   * yang menyentuhnya. Pengguna melihat total kosong tanpa tahu baris mana yang
   * bermasalah.
   */
  it("CACAT: jumlah dan harga baris isi yang kosong menjadi NaN", () => {
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [{ id: 31, product_id: 12 }],
    }).package_content!;

    expect(isi[0].quantity).toBeNaN();
    expect(isi[0].price).toBeNaN();
    expect(isi[0].discount).toBeNaN();
    expect(isi[0].quantity * isi[0].price).toBeNaN();
  });

  /**
   * CACAT: package_content yang tidak di-include membuat fromMap melempar
   * TypeError.
   *
   * fromMap langsung memanggil `data.package_content.map(...)` tanpa memeriksa
   * apa pun. Setiap query yang mengambil paket tanpa `include: { package_content
   * : true }` — misalnya untuk sekadar memeriksa nama paket sudah dipakai atau
   * belum — akan menabrak "Cannot read properties of undefined (reading 'map')".
   *
   * Akibatnya bagi pengguna: permintaan berakhir dengan galat 500, bukan data
   * paket tanpa isi. Cacat ini juga membuat model ini tidak bisa dipakai ulang
   * untuk endpoint ringkas mana pun.
   */
  it("CACAT: package_content yang tidak dikirim melempar TypeError", () => {
    const { package_content, ...tanpa } = barisPrisma;

    expect(() => PackageCodeModel.fromMap(tanpa)).toThrow(TypeError);
    expect(() => PackageCodeModel.fromMap(tanpa)).toThrow(/map/);
  });

  /**
   * CACAT: package_content bernilai null juga melempar TypeError.
   *
   * Relasi opsional yang dikembalikan Prisma sebagai null menabrak masalah yang
   * sama persis dengan kasus undefined di atas.
   */
  it("CACAT: package_content bernilai null melempar TypeError", () => {
    expect(() =>
      PackageCodeModel.fromMap({ ...barisPrisma, package_content: null })
    ).toThrow(TypeError);
  });
});

describe("Relasi bersarang di dalam isi paket", () => {
  const isiLengkap = {
    ...isiPaket,
    product: {
      id: 12,
      reference: "PRD-001",
      description: "Besi Beton 10mm",
      unit: "BATANG",
      purchase_price: "12000",
      is_delete: false,
    },
    product_unit: {
      id: 41,
      product_id: 12,
      unit: "IKAT",
      conversion: "10",
      sales_price: "150000",
    },
  };

  it("memetakan produk menjadi bentuk ringkas empat kolom", () => {
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [isiLengkap],
    }).package_content![0] as unknown as Record<string, any>;

    expect(isi.product).toEqual({
      id: 12,
      reference: "PRD-001",
      description: "Besi Beton 10mm",
      unit: "BATANG",
    });
    // Harga beli sengaja tidak ikut bocor ke klien lewat jalur paket.
    expect(isi.product.purchase_price).toBeUndefined();
  });

  it("memetakan satuan produk dan mengubah konversinya menjadi angka", () => {
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [isiLengkap],
    }).package_content![0] as unknown as Record<string, any>;

    expect(isi.product_unit).toEqual({ id: 41, conversion: 10, unit: "IKAT" });
    expect(typeof isi.product_unit.conversion).toBe("number");
  });

  it("membiarkan produk dan satuan undefined bila tidak di-include", () => {
    const isi = PackageCodeModel.fromMap(barisPrisma)
      .package_content![0] as unknown as Record<string, unknown>;

    expect(isi.product).toBeUndefined();
    expect(isi.product_unit).toBeUndefined();
  });

  it("memperlakukan produk bernilai null sebagai tidak ada", () => {
    const isi = PackageCodeModel.fromMap({
      ...barisPrisma,
      package_content: [{ ...isiPaket, product: null, product_unit: null }],
    }).package_content![0] as unknown as Record<string, unknown>;

    expect(isi.product).toBeUndefined();
    expect(isi.product_unit).toBeUndefined();
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("meneruskan boolean asli", () => {
    expect(
      PackageCodeModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  it("membiarkan is_delete undefined bila tidak dikirim", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(PackageCodeModel.fromMap(tanpa).is_delete).toBeUndefined();
  });

  /**
   * CACAT: is_delete tidak diterjemahkan sama sekali.
   *
   * Nilainya disalin apa adanya, jadi TinyInt MySQL yang datang sebagai angka
   * tetap angka, dan teks "0" — yang berarti "belum dihapus" — justru bernilai
   * TRUTHY di JavaScript.
   *
   * Akibatnya bagi pengguna: daftar paket yang disaring dengan
   * `if (paket.is_delete)` di frontend bisa menyembunyikan seluruh paket yang
   * masih aktif, sehingga kasir tidak menemukan satu pun paket untuk dijual.
   */
  it("CACAT: angka dan teks pada is_delete diteruskan mentah", () => {
    expect(
      PackageCodeModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1);

    const teksNol = PackageCodeModel.fromMap({
      ...barisPrisma,
      is_delete: "0",
    });
    expect(teksNol.is_delete).toBe("0");
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan objek Date dari Prisma apa adanya", () => {
    expect(PackageCodeModel.fromMap(barisPrisma).created_at).toBeInstanceOf(
      Date
    );
  });

  it("membiarkan created_at undefined bila tidak dikirim, bukan Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    expect(PackageCodeModel.fromMap(tanpa).created_at).toBeUndefined();
  });

  /**
   * CACAT: tanggal berbentuk teks tidak pernah diubah menjadi Date.
   *
   * Tipe bidangnya dijanjikan Date, tetapi fromMap meneruskan apa pun yang
   * datang. Kode pemanggil yang memanggil `created_at.getTime()` akan melempar
   * TypeError bila barisnya berasal dari query mentah, bukan Prisma ORM.
   */
  it("CACAT: teks tanggal tetap teks, bukan Date", () => {
    const m = PackageCodeModel.fromMap({
      ...barisPrisma,
      created_at: "2026-01-12 00:00:00",
    });

    expect(typeof m.created_at).toBe("string");
    expect(m.created_at).not.toBeInstanceOf(Date);
  });
});
