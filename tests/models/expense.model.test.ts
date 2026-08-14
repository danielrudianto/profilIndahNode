import { Prisma } from "@prisma/client";
import { ExpenseModel } from "../../src/models/expense.model";
import ExpenseTypeModel from "../../src/models/expense-type.model";
import { CompanyModel } from "../../src/models/company.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku ExpenseModel.
 *
 * Model pengeluaran adalah salah satu yang paling rapi di repo ini: seluruh
 * bidang konstruktornya benar-benar diteruskan fromMap, jadi tidak ada bidang
 * yang diam-diam hilang.
 *
 * Yang tetap perlu dijaga adalah tiga hal:
 *
 *   `value` dibungkus Number(). Bagus untuk Prisma.Decimal, tetapi berbahaya
 *   bila nilainya tidak dikirim — Number(undefined) menghasilkan NaN.
 *
 *   `created_at` diberi nilai cadangan `new Date()` di konstruktor. Ini
 *   menutupi data yang hilang alih-alih menampakkannya.
 *
 *   Urutan pemeriksaan null/undefined pada relasi penghapus membuat salah satu
 *   cabangnya menjadi kode mati.
 */

const barisPrisma = {
  id: 21,
  date: new Date("2026-04-05T00:00:00.000Z"),
  value: new Prisma.Decimal("1750000.00"),
  created_at: new Date("2026-04-05T08:00:00.000Z"),
  created_by: 3,
  description: "Servis kendaraan operasional",
  expense_type_id: 8,
  company_id: 2,
  is_delete: false,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang pokok pengeluaran", () => {
    const m = ExpenseModel.fromMap(barisPrisma);

    expect(m.id).toBe(21);
    expect(m.description).toBe("Servis kendaraan operasional");
    expect(m.expense_type_id).toBe(8);
    expect(m.company_id).toBe(2);
    expect(m.created_by).toBe(3);
  });

  it("menyalin jejak penghapusan bila ada", () => {
    const m = ExpenseModel.fromMap({
      ...barisPrisma,
      is_delete: true,
      deleted_by: 5,
      deleted_at: new Date("2026-04-06T00:00:00.000Z"),
    });

    expect(m.is_delete).toBe(true);
    expect(m.deleted_by).toBe(5);
    expect(m.deleted_at).toBeInstanceOf(Date);
  });

  it("menghasilkan instance ExpenseModel, bukan objek biasa", () => {
    expect(ExpenseModel.fromMap(barisPrisma)).toBeInstanceOf(ExpenseModel);
  });
});

describe("Bidang angka value", () => {
  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = ExpenseModel.fromMap(barisPrisma);

    expect(m.value).toBe(1750000);
    expect(typeof m.value).toBe("number");
  });

  it("mengubah teks menjadi angka", () => {
    expect(
      ExpenseModel.fromMap({ ...barisPrisma, value: "99500.25" }).value
    ).toBe(99500.25);
  });

  it("angka nol tetap nol, tidak berubah menjadi nilai lain", () => {
    expect(ExpenseModel.fromMap({ ...barisPrisma, value: 0 }).value).toBe(0);
  });

  /**
   * CACAT: nilai pengeluaran yang tidak dikirim menjadi NaN, lalu null di JSON.
   *
   * `Number(undefined)` adalah NaN, dan JSON.stringify mengubah NaN menjadi
   * null. Frontend menerima `"value": null` untuk bidang yang diketik `number`
   * wajib.
   *
   * Akibatnya bagi pemakai: baris pengeluaran itu tampil kosong pada daftar,
   * dan setiap penjumlahan total pengeluaran di sisi klien ikut menjadi NaN —
   * satu baris rusak membuat SELURUH total laporan bulanan menjadi kosong,
   * bukan hanya barisnya sendiri. Tidak ada galat di sisi server sama sekali.
   */
  it("CACAT: value yang hilang menjadi NaN dan tersaji null", () => {
    const { value, ...tanpa } = barisPrisma;
    const m = ExpenseModel.fromMap(tanpa);

    expect(Number.isNaN(m.value)).toBe(true);
    expect(JSON.parse(JSON.stringify(m)).value).toBeNull();
  });

  /**
   * CACAT: teks yang bukan angka juga diam-diam menjadi NaN.
   *
   * Number("") memang 0, tetapi Number("Rp1.000") adalah NaN. Tidak ada
   * pemeriksaan sama sekali, jadi data kotor di basis data merambat ke
   * laporan tanpa terdeteksi.
   */
  it("CACAT: teks bukan angka menjadi NaN tanpa peringatan", () => {
    expect(
      Number.isNaN(
        ExpenseModel.fromMap({ ...barisPrisma, value: "Rp1.000" }).value
      )
    ).toBe(true);
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan created_at dari basis data apa adanya bila ada", () => {
    const m = ExpenseModel.fromMap(barisPrisma);
    expect(m.created_at?.toISOString()).toBe("2026-04-05T08:00:00.000Z");
  });

  /**
   * CACAT: created_at yang hilang diganti waktu sekarang.
   *
   * Konstruktornya menulis `data.created_at || new Date()`. Berbeda dari model
   * lain yang menghasilkan Invalid Date, di sini datanya DIPALSUKAN dengan
   * jam permintaan berlangsung.
   *
   * Akibatnya bagi pemakai jauh lebih berbahaya daripada tanggal kosong:
   * pengeluaran lama yang created_at-nya tidak ikut termuat akan tampak
   * seolah-olah baru dibuat hari ini. Ia muncul di urutan teratas daftar
   * terbaru dan ikut terhitung pada laporan bulan berjalan, padahal bukan
   * milik bulan itu. Tidak ada cara membedakannya dari data yang sah.
   *
   * Perhatikan juga `|| ` menolak nilai jatuh (falsy), jadi ini juga berlaku
   * untuk null.
   */
  it("CACAT: created_at yang hilang dipalsukan menjadi waktu sekarang", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = ExpenseModel.fromMap(tanpa);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(isNaN(m.created_at!.getTime())).toBe(false);
    expect(m.created_at!.getTime()).toBeGreaterThan(
      new Date("2025-01-01").getTime()
    );
  });

  it("CACAT: created_at null juga dipalsukan, bukan tetap null", () => {
    const m = ExpenseModel.fromMap({ ...barisPrisma, created_at: null });
    expect(m.created_at).toBeInstanceOf(Date);
  });

  /**
   * CACAT: `date` — tanggal pengeluaran yang sesungguhnya — tidak dibungkus.
   *
   * Inilah tanggal yang dipakai laporan untuk mengelompokkan pengeluaran per
   * bulan, dan justru bidang inilah yang tidak diberi penjagaan apa pun.
   * Nilai teks lolos apa adanya walaupun diketik `Date`.
   *
   * Akibatnya kode pemanggil yang memakai `.getMonth()` untuk mengelompokkan
   * laporan akan melempar galat pada baris tersebut.
   */
  it("CACAT: date berupa teks tetap teks, bukan Date", () => {
    const m = ExpenseModel.fromMap({ ...barisPrisma, date: "2026-04-05" });

    expect(m.date).not.toBeInstanceOf(Date);
    expect(typeof m.date).toBe("string");
  });

  it("CACAT: date yang hilang membuat kuncinya lenyap dari JSON", () => {
    const { date, ...tanpa } = barisPrisma;
    const m = ExpenseModel.fromMap(tanpa);

    expect(m.date).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('"date"');
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      ExpenseModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  it("membiarkan is_delete undefined bila tidak dikirim", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(ExpenseModel.fromMap(tanpa).is_delete).toBeUndefined();
  });

  /**
   * CACAT: is_delete tidak diterjemahkan sama sekali.
   *
   * Tidak ada percabangan boolean/teks seperti pada CustomerModel; nilainya
   * disalin mentah. Kolom TinyInt yang kembali sebagai angka atau teks ikut
   * terkirim apa adanya walaupun bidangnya diketik `boolean`.
   *
   * Yang paling merugikan adalah teks "0": di JavaScript teks "0" bernilai
   * benar, jadi frontend yang menyaring dengan `if (!item.is_delete)`
   * membuang pengeluaran yang MASIH AKTIF dari daftar dan dari total laporan.
   */
  it("CACAT: angka dan teks lolos apa adanya, bukan menjadi boolean", () => {
    expect(
      ExpenseModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1 as unknown as boolean);
    expect(
      ExpenseModel.fromMap({ ...barisPrisma, is_delete: 0 }).is_delete
    ).toBe(0 as unknown as boolean);

    const teksNol = ExpenseModel.fromMap({ ...barisPrisma, is_delete: "0" });
    expect(teksNol.is_delete).toBe("0" as unknown as boolean);
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});

describe("Relasi jenis pengeluaran (expense_type)", () => {
  const barisJenis = {
    id: 8,
    name: "Kendaraan",
    description: "Biaya kendaraan operasional",
    created_by: 1,
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    parent_id: null,
  };

  it("jenis pengeluaran yang dikirim menjadi instance ExpenseTypeModel", () => {
    const m = ExpenseModel.fromMap({
      ...barisPrisma,
      expense_type: barisJenis,
    });

    expect(m.expense_type).toBeInstanceOf(ExpenseTypeModel);
    expect(m.expense_type!.name).toBe("Kendaraan");
    expect(m.expense_type!.id).toBe(8);
  });

  it("jenis pengeluaran yang tidak diminta tetap undefined", () => {
    expect(ExpenseModel.fromMap(barisPrisma).expense_type).toBeUndefined();
  });

  it("jenis pengeluaran null diperlakukan sama dengan tidak dikirim", () => {
    expect(
      ExpenseModel.fromMap({ ...barisPrisma, expense_type: null }).expense_type
    ).toBeUndefined();
  });
});

describe("Relasi perusahaan (company)", () => {
  const barisCompany = {
    id: 2,
    name: "PT Profil Indah",
    address: "Jl. Industri 1",
    npwp: "998877665544332",
    created_by: 1,
    created_at: new Date("2020-01-01T00:00:00.000Z"),
  };

  it("perusahaan yang dikirim menjadi instance CompanyModel", () => {
    const m = ExpenseModel.fromMap({ ...barisPrisma, company: barisCompany });

    expect(m.company).toBeInstanceOf(CompanyModel);
    expect(m.company!.name).toBe("PT Profil Indah");
  });

  it("perusahaan yang tidak diminta tetap undefined", () => {
    expect(ExpenseModel.fromMap(barisPrisma).company).toBeUndefined();
  });

  /**
   * CACAT: id perusahaan hilang, dan created_at-nya dipalsukan.
   *
   * Keduanya berasal dari CompanyModel: `CompanyModel.fromMap` tidak
   * meneruskan `id` sama sekali, dan konstruktornya menimpa created_at dengan
   * `new Date()`. ExpenseModel hanya ikut terkena akibatnya.
   *
   * Akibatnya bagi pemakai: objek perusahaan yang menempel pada pengeluaran
   * tidak punya id, sehingga frontend tidak bisa membuat tautan ke halaman
   * perusahaan atau mencocokkannya dengan daftar perusahaan yang sudah dimuat.
   * Satu-satunya penanda yang tersisa hanyalah `company_id` di tingkat
   * pengeluaran.
   */
  it("membawa id perusahaan", () => {
    const m = ExpenseModel.fromMap({ ...barisPrisma, company: barisCompany });

    expect(m.company!.id).toBe(barisCompany.id);
    expect(JSON.parse(JSON.stringify(m.company)).id).toBe(barisCompany.id);
  });

  it("created_at perusahaan berasal dari baris, bukan jam permintaan", () => {
    const m = ExpenseModel.fromMap({ ...barisPrisma, company: barisCompany });

    expect(m.company!.created_at!.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z"
    );
  });
});

describe("Relasi pengguna pembuat dan penghapus", () => {
  const barisUser = { id: 3, name: "Sari", username: "sari", role: 2 };

  it("pengguna pembuat menjadi UserViewModel", () => {
    const m = ExpenseModel.fromMap({
      ...barisPrisma,
      user_expense_created_byTouser: barisUser,
    });

    expect(m.user_expense_created_byTouser).toBeInstanceOf(UserViewModel);
    expect(m.user_expense_created_byTouser!.name).toBe("Sari");
  });

  it("pengguna pembuat yang tidak diminta tetap undefined", () => {
    expect(
      ExpenseModel.fromMap(barisPrisma).user_expense_created_byTouser
    ).toBeUndefined();
  });

  it("pengguna penghapus menjadi UserViewModel bila ada", () => {
    const m = ExpenseModel.fromMap({
      ...barisPrisma,
      user_expense_deleted_byTouser: {
        id: 5,
        name: "Budi",
        username: "budi",
        role: 5,
      },
    });

    expect(m.user_expense_deleted_byTouser).toBeInstanceOf(UserViewModel);
  });

  /**
   * CACAT: relasi penghapus SELALU menjadi null bila tidak dikirim.
   *
   * Urutan ternari-nya: `data.x == null ? null : data.x == undefined ?
   * undefined : ...`. Karena `undefined == null` bernilai benar, cabang
   * pertama sudah menangkap keduanya. Cabang undefined di bawahnya adalah
   * KODE MATI yang tidak akan pernah tercapai.
   *
   * Akibatnya bagi pemakai: setiap balasan pengeluaran selalu memuat
   * `"user_expense_deleted_byTouser": null`, bahkan pada kueri daftar yang
   * sama sekali tidak meminta relasi itu. Frontend tidak bisa membedakan
   * "pengeluaran ini belum pernah dihapus" dari "informasi penghapus memang
   * tidak ikut dimuat" — dan setiap balasan daftar membawa muatan kunci null
   * yang sia-sia.
   *
   * Bandingkan dengan `user_expense_created_byTouser` di model yang sama, yang
   * urutannya benar sehingga menghasilkan undefined dan kuncinya hilang.
   */
  it("CACAT: penghapus yang tidak diminta tetap muncul sebagai null di JSON", () => {
    const m = ExpenseModel.fromMap(barisPrisma);

    expect(m.user_expense_deleted_byTouser).toBeNull();
    expect(m.user_expense_deleted_byTouser).not.toBeUndefined();
    expect(JSON.stringify(m)).toContain('"user_expense_deleted_byTouser":null');
  });
});
