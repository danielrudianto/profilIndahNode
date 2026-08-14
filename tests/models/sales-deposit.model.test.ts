import { Prisma } from "@prisma/client";
import { SalesDepositModel } from "../../src/models/sales-deposit.model";
import { SalesDepositPaymentModel } from "../../src/models/sales-deposit-payment.model";

/**
 * Perilaku SalesDepositModel.
 *
 * Model ini kembaran SalesInvoiceModel: bidangnya hampir sama, hanya larik
 * bersarangnya bernama sales_deposit dan ada tambahan `type`. Karena kembar,
 * sebagian besar cacatnya juga kembar — dicatat di sini supaya tidak ada yang
 * mengira memperbaiki satu berkas sudah cukup.
 *
 * Ada satu perbedaan penting yang justru bukan cacat teknis melainkan jebakan
 * bagi frontend: bidang statusnya di sini bernama `isConfirm`, sedangkan pada
 * SalesInvoiceModel bernama `is_confirm`. Dua balasan yang isinya sejenis punya
 * nama kunci berbeda, jadi komponen yang dipakai ulang untuk keduanya harus
 * membaca dua nama.
 *
 * Bidang uang (discount, delivery, service, dan nilai tiap baris) berasal dari
 * kolom DECIMAL MySQL, jadi sampai sebagai Prisma.Decimal atau teks — bukan
 * number. Konversinya diperiksa satu per satu di bawah.
 *
 * Bentuk berkas ini mengikuti tests/models/customer.model.test.ts.
 */

const desimal = (nilai: string) => new Prisma.Decimal(nilai);

const barisPrisma = {
  id: 12,
  name: "DP/2026/001",
  date: new Date("2026-04-01T00:00:00.000Z"),
  discount: desimal("1500.50"),
  delivery: desimal("2000.25"),
  service: desimal("0"),
  sales: "Andi",
  customer_id: 5,
  created_by: 2,
  created_at: new Date("2026-04-01T01:00:00.000Z"),
  is_confirm: true,
  confirmed_by: 3,
  confirmed_at: new Date("2026-04-02T00:00:00.000Z"),
  is_paid: false,
  is_delete: false,
  uuid: "9ab2-uuid",
  type: "DEPOSIT",
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas deposit", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.id).toBe(12);
    expect(m.name).toBe("DP/2026/001");
    expect(m.uuid).toBe("9ab2-uuid");
    expect(m.type).toBe("DEPOSIT");
    expect(m.sales).toBe("Andi");
  });

  it("memetakan customer_id menjadi customerID", () => {
    expect(SalesDepositModel.fromMap(barisPrisma).customerID).toBe(5);
  });

  it("menyalin jejak pembuatan dan konfirmasi", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.createdBy).toBe(2);
    expect(m.createdAt.toISOString()).toBe("2026-04-01T01:00:00.000Z");
    expect(m.confirmedBy).toBe(3);
    expect(m.confirmedAt).toEqual(new Date("2026-04-02T00:00:00.000Z"));
  });

  it("menghasilkan instance SalesDepositModel, bukan objek biasa", () => {
    expect(SalesDepositModel.fromMap(barisPrisma)).toBeInstanceOf(
      SalesDepositModel
    );
  });

  /**
   * Catatan penamaan: status konfirmasi di sini bernama isConfirm.
   *
   * Bukan cacat pada satu berkas, tetapi penyebab kebingungan nyata: faktur
   * penjualan mengirim `is_confirm`, deposit mengirim `isConfirm`. Frontend
   * yang memakai satu komponen untuk kedua dokumen akan melihat status kosong
   * pada salah satunya bila hanya membaca satu nama.
   */
  it("memakai nama isConfirm, bukan is_confirm seperti pada faktur", () => {
    const m = SalesDepositModel.fromMap(barisPrisma) as unknown as Record<
      string,
      unknown
    >;

    expect(m.isConfirm).toBe(true);
    expect(m.is_confirm).toBeUndefined();
  });
});

describe("Bidang uang", () => {
  it("mengubah Prisma.Decimal menjadi number sungguhan", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(typeof m.discount).toBe("number");
    expect(typeof m.delivery).toBe("number");
    expect(typeof m.service).toBe("number");
    expect(m.discount).toBe(1500.5);
    expect(m.delivery).toBe(2000.25);
  });

  it("mengubah teks DECIMAL dari query mentah menjadi number", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      discount: "1500.50",
      delivery: "2000.25",
    });

    expect(m.discount).toBe(1500.5);
    // Penjumlahan benar-benar menjumlah, bukan menggabungkan teks.
    expect(m.discount + m.delivery).toBe(3500.75);
  });

  it("mempertahankan galat pembulatan biner apa adanya (0.1 + 0.2)", () => {
    const m = SalesDepositModel.fromMap({
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
   * Terjadi bila query hanya memilih sebagian kolom. NaN menular ke setiap
   * penjumlahan, jadi satu kolom yang hilang membuat SELURUH nominal deposit
   * tampil kosong di layar (NaN diserialkan menjadi null), bukan hanya kolom
   * itu saja.
   */
  it("CACAT: service yang tidak dikirim menjadi NaN dan menular ke total", () => {
    const { service, ...tanpa } = barisPrisma;
    const m = SalesDepositModel.fromMap(tanpa);

    expect(Number.isNaN(m.service)).toBe(true);
    expect(Number.isNaN(m.service + m.delivery)).toBe(true);
    expect(JSON.parse(JSON.stringify({ s: m.service })).s).toBeNull();
  });
});

describe("Penanganan kolom boolean", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.isConfirm).toBe(true);
    expect(m.isPaid).toBe(false);
    expect(m.isDelete).toBe(false);
  });

  /**
   * CACAT: tidak ada normalisasi boolean sama sekali.
   *
   * Nilai dari kolom TinyInt MySQL bisa sampai sebagai angka 1/0, dan lewat
   * query mentah sebagai teks "1"/"0". Model ini menyalinnya mentah-mentah.
   *
   * Teks adalah masalah terbesarnya: di JavaScript "0" adalah string tidak
   * kosong sehingga bernilai TRUTHY. Deposit yang belum dibayar (is_paid = "0")
   * tampil sebagai sudah lunas, dan deposit yang sudah dihapus (is_delete =
   * "0") pun terbaca sebagai terhapus. Pengguna melihat status yang berkebalikan
   * dari keadaan sebenarnya, tanpa satu pun galat muncul.
   */
  it("CACAT: teks '0' diteruskan apa adanya dan bersifat truthy", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      is_paid: "0",
      is_confirm: "0",
      is_delete: "0",
    });

    expect(typeof m.isPaid).toBe("string");
    expect(Boolean(m.isPaid)).toBe(true);
    expect(Boolean(m.isConfirm)).toBe(true);
    expect(Boolean(m.isDelete)).toBe(true);
  });

  it("CACAT: angka 1 dan 0 juga tidak diubah menjadi boolean", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      is_confirm: 1,
      is_paid: 0,
      is_delete: 0,
    });

    expect(typeof m.isConfirm).toBe("number");
    expect(m.isConfirm).toBe(1 as unknown as boolean);
    expect((m.isConfirm as unknown) === true).toBe(false);
  });

  it("CACAT: nilai boolean yang tidak dikirim menghilang dari JSON", () => {
    const { is_paid, ...tanpa } = barisPrisma;
    const m = SalesDepositModel.fromMap(tanpa);

    expect(m.isPaid).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("isPaid");
  });
});

describe("Bidang tanggal", () => {
  /**
   * CACAT: `date` tidak pernah diubah menjadi Date.
   *
   * createdAt dibungkus `new Date(...)`, tetapi tanggal deposit disalin apa
   * adanya walau tipenya dideklarasikan Date. Bila barisnya berasal dari query
   * mentah, nilainya tetap teks, dan kode yang memanggil `deposit.date.getTime()`
   * gagal padahal TypeScript menjamin bidang itu Date.
   */
  it("CACAT: date berupa teks tetap teks, bukan Date", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      date: "2026-04-01T00:00:00.000Z",
    });

    expect(typeof m.date).toBe("string");
    expect(m.date).not.toBeInstanceOf(Date);
  });

  /**
   * CACAT: created_at yang tidak dikirim menjadi Invalid Date.
   *
   * Diserialkan menjadi null, sehingga klien tidak bisa membedakannya dari
   * tanggal yang memang kosong dan pengurutan daftar deposit menjadi acak.
   */
  it("CACAT: created_at yang hilang menjadi Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = SalesDepositModel.fromMap(tanpa);

    expect(isNaN(m.createdAt.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.createdAt })).t).toBeNull();
  });
});

describe("Bidang sales", () => {
  /**
   * CACAT: nama sales berupa teks kosong berubah menjadi null.
   *
   * Konstruktornya menulis `data.sales || null`, jadi setiap nilai falsy —
   * termasuk teks kosong yang tersimpan di basis data — dilaporkan sebagai
   * null. Frontend tidak bisa membedakan "kolom sales memang kosong" dari
   * "deposit ini tidak punya sales", dan penyimpanan ulang dari layar edit bisa
   * mengganti "" menjadi NULL tanpa disengaja.
   *
   * SalesInvoiceModel tidak melakukan ini: di sana teks kosong tetap "".
   */
  it("CACAT: sales berupa teks kosong menjadi null", () => {
    expect(SalesDepositModel.fromMap({ ...barisPrisma, sales: "" }).sales).toBe(
      null
    );
  });

  it("sales null tetap null", () => {
    expect(
      SalesDepositModel.fromMap({ ...barisPrisma, sales: null }).sales
    ).toBeNull();
  });
});

describe("Larik bersarang sales_deposit", () => {
  const item = {
    id: 7,
    product_id: 4,
    product_unit_id: null,
    quantity: desimal("2"),
    price: desimal("15000.50"),
    discount: desimal("500.25"),
  };

  it("larik kosong tetap kosong", () => {
    expect(
      SalesDepositModel.fromMap({ ...barisPrisma, sales_deposit: [] })
        .sales_deposit
    ).toEqual([]);
  });

  it("satu anggota: seluruh nilai uang dan jumlah menjadi number", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      sales_deposit: [item],
    });

    expect(m.sales_deposit).toHaveLength(1);
    const baris = m.sales_deposit![0];
    expect(baris.id).toBe(7);
    expect(baris.product_id).toBe(4);
    expect(typeof baris.quantity).toBe("number");
    expect(baris.price).toBe(15000.5);
    expect(baris.discount).toBe(500.25);
    expect(baris.quantity * baris.price).toBe(30001);
  });

  it("sales_deposit yang tidak dikirim menjadi larik kosong", () => {
    expect(SalesDepositModel.fromMap(barisPrisma).sales_deposit).toEqual([]);
  });

  it("relasi produk yang tidak diikutkan menjadi undefined, product_unit null tetap null", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      sales_deposit: [item],
    });

    expect(m.sales_deposit![0].product).toBeUndefined();
    expect(m.sales_deposit![0].product_unit).toBeNull();
  });
});

describe("Larik bersarang sales_deposit_payment", () => {
  const bayar = {
    id: 41,
    date: new Date("2026-04-05T00:00:00.000Z"),
    payment_method_id: 4,
    value: desimal("1000.75"),
    payment_method: { id: 4, name: "Mandiri", description: "Transfer bank" },
  };

  it("larik kosong tetap kosong", () => {
    expect(
      SalesDepositModel.fromMap({
        ...barisPrisma,
        sales_deposit_payment: [],
      }).sales_deposit_payment
    ).toEqual([]);
  });

  it("satu anggota menjadi SalesDepositPaymentModel dengan nilai number", () => {
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      sales_deposit_payment: [bayar],
    });

    const p = m.sales_deposit_payment![0];
    expect(p).toBeInstanceOf(SalesDepositPaymentModel);
    expect(p.id).toBe(41);
    expect(typeof p.value).toBe("number");
    expect(p.value).toBe(1000.75);
    expect(p.date).toBeInstanceOf(Date);
    expect(p.payment_method?.name).toBe("Mandiri");
    // Induknya diisi dari id deposit, bukan dari kolom baris pembayaran.
    expect(p.sales_deposit_code_id).toBe(12);
  });

  /**
   * CACAT: sales_deposit_payment yang tidak diikutkan menghilang dari balasan,
   * sedangkan sales_deposit pada model yang sama menjadi larik kosong.
   *
   * Dua larik bersarang di satu fromMap memakai nilai bawaan berbeda: [] dan
   * undefined. Kunci bernilai undefined dibuang JSON.stringify, jadi balasan
   * untuk daftar deposit (yang biasanya tidak menyertakan relasi pembayaran)
   * sama sekali tidak memuat kunci sales_deposit_payment. Frontend yang memanggil
   * `deposit.sales_deposit_payment.length` gagal dengan TypeError, padahal pada
   * layar rincian bidang itu ada.
   */
  it("CACAT: sales_deposit_payment yang tidak dikirim hilang, bukan menjadi []", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.sales_deposit_payment).toBeUndefined();
    expect(m.sales_deposit).toEqual([]); // pasangannya justru []
    expect(JSON.stringify(m)).not.toContain("sales_deposit_payment");
  });

  /**
   * CACAT: setoran tanpa relasi payment_method dilaporkan sebagai "Cash".
   *
   * Di sini fromMap sudah berhati-hati: relasi yang tidak dimuat dikirim sebagai
   * undefined. Tetapi konstruktor SalesDepositPaymentModel menimpanya dengan
   * PaymentMethodViewModel.fromMap(undefined), yang mengembalikan objek bawaan
   * bernama "Cash".
   *
   * Akibatnya setoran lewat transfer bank yang relasinya kebetulan tidak
   * di-include tampil sebagai setoran TUNAI, lengkap dengan nama metode bayar
   * yang meyakinkan. Rekap kas harian ikut menghitungnya sebagai uang di laci.
   */
  it("CACAT: relasi payment_method yang tidak dimuat menjadi 'Cash' palsu", () => {
    const { payment_method, ...tanpaRelasi } = bayar;
    const m = SalesDepositModel.fromMap({
      ...barisPrisma,
      sales_deposit_payment: [tanpaRelasi],
    });

    const p = m.sales_deposit_payment![0];
    expect(p.payment_method_id).toBe(4);
    expect(p.payment_method?.name).toBe("Cash");
    expect(p.payment_method?.id).toBeNull();
  });
});

describe("Relasi customer dan pengguna", () => {
  /**
   * CACAT: relasi customer yang tidak dimuat dilaporkan sebagai null.
   *
   * Penjagaannya `data.customer == null ? null : data.customer == undefined ?
   * undefined : ...` memakai perbandingan longgar, dan `undefined == null`
   * bernilai benar — jadi cabang undefined tidak pernah tercapai (kode mati).
   *
   * Akibatnya balasan daftar deposit selalu memuat `customer: null`, yang
   * dibaca frontend sebagai "deposit ini memang tanpa pelanggan". Nama pelanggan
   * tampil kosong di daftar dan klien tidak tahu bahwa yang perlu dilakukan
   * hanyalah memuat relasinya.
   *
   * SalesInvoiceModel menulis penjagaan yang sama dengan urutan terbalik,
   * sehingga cacatnya juga terbalik: di sana justru null yang berubah menjadi
   * undefined.
   */
  it("CACAT: customer yang tidak dimuat menjadi null, bukan undefined", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.customer).toBeNull();
    expect(m.customer).not.toBeUndefined();
    expect(JSON.stringify(m)).toContain('"customer":null');
  });

  it("customer yang diikutkan menjadi CustomerModel", () => {
    const m = SalesDepositModel.fromMap({
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

  it("relasi pengguna yang tidak diikutkan tetap undefined", () => {
    const m = SalesDepositModel.fromMap(barisPrisma);

    expect(m.user_bill_code_created_byTouser).toBeUndefined();
    expect(m.user_bill_code_confirmed_byTouser).toBeUndefined();
  });
});
