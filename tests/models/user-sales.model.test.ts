import { UserSalesModel } from "../../src/models/user-sales.model";
import { ProductTypeModel } from "../../src/models/product-type.model";

/**
 * Perilaku UserSalesModel.
 *
 * Model penghubung antara pengguna dan jenis produk yang boleh dijualnya.
 * Isinya hanya tiga bidang, tetapi salah satunya relasi wajib: `product_type`
 * diteruskan langsung ke ProductTypeModel.fromMap TANPA penjagaan apa pun.
 *
 * Semua model lain di repo ini menjaga relasinya dengan pola
 * `data.x ? Model.fromMap(data.x) : undefined`. Di sini penjagaan itu tidak
 * ada, dan akibatnya bukan bidang kosong melainkan permintaan yang gagal.
 */

const barisPrisma = {
  id: 14,
  product_type_id: 2,
  product_type: {
    id: 2,
    name: "Besi Beton",
    created_by: 1,
    created_at: new Date("2023-02-02T00:00:00.000Z"),
    is_delete: false,
    can_delete: true,
  },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin kunci dan acuan jenis produk", () => {
    const m = UserSalesModel.fromMap(barisPrisma);

    expect(m.id).toBe(14);
    expect(m.product_type_id).toBe(2);
  });

  it("hanya membawa tiga bidang itu saja", () => {
    const m = UserSalesModel.fromMap({
      ...barisPrisma,
      user_id: 10,
      catatan_internal: "jangan dikirim",
    });

    expect(Object.keys(m)).toEqual(["id", "product_type_id", "product_type"]);
    expect(JSON.stringify(m)).not.toContain("catatan_internal");
  });

  it("menghasilkan instance UserSalesModel, bukan objek biasa", () => {
    expect(UserSalesModel.fromMap(barisPrisma)).toBeInstanceOf(UserSalesModel);
  });

  it("id boleh kosong pada baris yang belum tersimpan", () => {
    const { id, ...tanpa } = barisPrisma;
    expect(UserSalesModel.fromMap(tanpa).id).toBeUndefined();
  });
});

describe("Relasi product_type", () => {
  it("menerjemahkan relasi menjadi ProductTypeModel", () => {
    const m = UserSalesModel.fromMap(barisPrisma);

    expect(m.product_type).toBeInstanceOf(ProductTypeModel);
    expect(m.product_type.id).toBe(2);
    expect(m.product_type.name).toBe("Besi Beton");
  });

  it("penerjemahan boolean di dalam relasi ikut berjalan", () => {
    // ProductTypeModel menerjemahkan teks "1"/"0" pada can_delete, jadi hasil
    // di dalam relasi bukan sekadar salinan mentah baris Prisma.
    const m = UserSalesModel.fromMap({
      ...barisPrisma,
      product_type: { ...barisPrisma.product_type, can_delete: "0" },
    });

    expect(m.product_type.can_delete).toBe(false);
  });

  it("objek relasi adalah salinan baru, bukan baris Prisma yang sama", () => {
    const m = UserSalesModel.fromMap(barisPrisma);
    expect(m.product_type).not.toBe(barisPrisma.product_type);
  });

  /**
   * CACAT: relasi product_type yang kosong membuat fromMap melempar galat.
   *
   * fromMap langsung memanggil `ProductTypeModel.fromMap(data.product_type)`,
   * dan fungsi itu membaca `data.id` pada baris pertamanya. Bila relasinya
   * tidak ikut di-include pada query — atau baris penghubungnya menunjuk jenis
   * produk yang sudah terhapus keras sehingga left join menghasilkan null —
   * yang terjadi adalah TypeError, bukan bidang kosong.
   *
   * Akibat bagi pengguna: seluruh permintaan gagal dengan 500 Internal Server
   * Error. Karena user_sales tertempel pada objek pengguna, satu baris
   * penghubung yang cacat cukup untuk membuat SELURUH daftar pengguna tidak
   * bisa dimuat — bukan hanya baris yang bermasalah. Model lain di repo ini
   * memakai penjagaan `? :` yang mencegah tepat keadaan ini.
   */
  it("CACAT: relasi yang tidak di-include melempar TypeError, bukan menghasilkan kosong", () => {
    const { product_type, ...tanpa } = barisPrisma;

    expect(() => UserSalesModel.fromMap(tanpa)).toThrow(TypeError);
    expect(() =>
      UserSalesModel.fromMap({ ...barisPrisma, product_type: null })
    ).toThrow(TypeError);
  });

  it("CACAT: pesan galatnya tidak menyebut relasi mana yang kosong", () => {
    const { product_type, ...tanpa } = barisPrisma;

    // Pesannya sekadar "Cannot read properties of undefined", tanpa menyebut
    // product_type maupun user_sales. Penelusuran di log produksi karena itu
    // hanya bisa mengandalkan jejak tumpukan.
    expect(() => UserSalesModel.fromMap(tanpa)).toThrow(
      /Cannot read properties of undefined/
    );
  });
});
