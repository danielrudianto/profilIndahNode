import { AchievementModel } from "../../src/models/achievement.model";
import achievements from "../../src/constants/achievement.constant";
import { IAchievement } from "../../src/interfaces/achievement.interface";

/**
 * Perilaku AchievementModel.
 *
 * Model ini berbeda dari model lain di repo: ia tidak menerjemahkan baris
 * basis data dan tidak punya fromMap. Ia hanya menyimpan dua angka — jumlah
 * pelanggan baru dan nilai penjualan seorang salesman — lalu menyaring daftar
 * konstanta di constants/achievement.constant.ts berdasarkan ambang batas.
 *
 * Karena keputusannya murni perbandingan angka, yang perlu diuji dengan
 * teliti adalah perilakunya TEPAT DI AMBANG, satu di bawah ambang, dan satu di
 * atas ambang — untuk kedua bidang. Kesalahan satu angka di sini berarti
 * seorang salesman kehilangan atau mendapat lencana yang bukan haknya.
 *
 * Perbandingannya memakai `>=` (lebih besar ATAU SAMA DENGAN), sedangkan
 * keterangan tiap pencapaian tertulis "more than" (lebih dari). Keduanya tidak
 * sama, dan selisihnya persis satu nilai — lihat blok CACAT di bawah.
 */

const nama = (m: AchievementModel) =>
  m.getAchievements().map((a) => a.shortName);

describe("Ambang batas bidang penjualan (sales)", () => {
  const ambangPenjualan: [string, number][] = [
    ["OrdinarySales", 10_000_000],
    ["ExtraordinarySales", 100_000_000],
    ["SuperSales", 1_000_000_000],
    ["MegaSales", 10_000_000_000],
  ];

  it.each(ambangPenjualan)(
    "%s diberikan tepat pada nilai ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: 0, sales: minimum });
      expect(nama(m)).toContain(shortName);
    }
  );

  it.each(ambangPenjualan)(
    "%s TIDAK diberikan pada satu rupiah di bawah ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: 0, sales: minimum - 1 });
      expect(nama(m)).not.toContain(shortName);
    }
  );

  it.each(ambangPenjualan)(
    "%s diberikan pada satu rupiah di atas ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: 0, sales: minimum + 1 });
      expect(nama(m)).toContain(shortName);
    }
  );

  it("pencapaian bersifat menumpuk, bukan menggantikan", () => {
    const m = new AchievementModel({ customer: 0, sales: 1_000_000_000 });

    // Yang tertinggi tercapai berarti semua yang di bawahnya ikut tercapai.
    expect(nama(m)).toEqual([
      "OrdinarySales",
      "ExtraordinarySales",
      "SuperSales",
    ]);
  });

  it("penjualan di bawah ambang terendah tidak menghasilkan apa pun", () => {
    expect(
      nama(new AchievementModel({ customer: 0, sales: 9_999_999 }))
    ).toEqual([]);
  });
});

describe("Ambang batas bidang pelanggan (customer)", () => {
  const ambangPelanggan: [string, number][] = [
    ["JuniorCustomerHunter", 1],
    ["CustomerHunter", 50],
    ["SeniorCustomerHunter", 150],
    ["MasterCustomerHunter", 500],
  ];

  it.each(ambangPelanggan)(
    "%s diberikan tepat pada nilai ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: minimum, sales: 0 });
      expect(nama(m)).toContain(shortName);
    }
  );

  it.each(ambangPelanggan)(
    "%s TIDAK diberikan pada satu pelanggan di bawah ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: minimum - 1, sales: 0 });
      expect(nama(m)).not.toContain(shortName);
    }
  );

  it.each(ambangPelanggan)(
    "%s diberikan pada satu pelanggan di atas ambang %i",
    (shortName, minimum) => {
      const m = new AchievementModel({ customer: minimum + 1, sales: 0 });
      expect(nama(m)).toContain(shortName);
    }
  );

  it("pelanggan pertama langsung membuka pencapaian terendah", () => {
    expect(nama(new AchievementModel({ customer: 1, sales: 0 }))).toEqual([
      "JuniorCustomerHunter",
    ]);
    expect(nama(new AchievementModel({ customer: 0, sales: 0 }))).toEqual([]);
  });

  it("pencapaian pelanggan juga menumpuk", () => {
    expect(nama(new AchievementModel({ customer: 150, sales: 0 }))).toEqual([
      "JuniorCustomerHunter",
      "CustomerHunter",
      "SeniorCustomerHunter",
    ]);
  });
});

describe("Kedua bidang bersamaan", () => {
  it("bidang penjualan dan pelanggan dinilai terpisah, tidak saling memengaruhi", () => {
    // Penjualan besar tetapi tanpa pelanggan baru: hanya lencana penjualan.
    expect(
      nama(new AchievementModel({ customer: 0, sales: 10_000_000_000 }))
    ).toEqual([
      "OrdinarySales",
      "ExtraordinarySales",
      "SuperSales",
      "MegaSales",
    ]);

    // Banyak pelanggan baru tanpa penjualan: hanya lencana pelanggan.
    expect(nama(new AchievementModel({ customer: 500, sales: 0 }))).toEqual([
      "JuniorCustomerHunter",
      "CustomerHunter",
      "SeniorCustomerHunter",
      "MasterCustomerHunter",
    ]);
  });

  it("nilai tertinggi pada keduanya menghasilkan seluruh delapan pencapaian", () => {
    const m = new AchievementModel({
      customer: 500,
      sales: 10_000_000_000,
    });

    expect(m.getAchievements()).toHaveLength(achievements.length);
    expect(m.getAchievements()).toHaveLength(8);
  });

  it("urutannya mengikuti urutan daftar konstanta: penjualan dulu, lalu pelanggan", () => {
    const m = new AchievementModel({ customer: 500, sales: 10_000_000_000 });

    expect(nama(m)).toEqual(achievements.map((a) => a.shortName));
    expect(nama(m)[0]).toBe("OrdinarySales");
    expect(nama(m)[4]).toBe("JuniorCustomerHunter");
  });
});

describe("Nilai batas dan nilai tidak wajar", () => {
  it("nol pada kedua bidang menghasilkan larik kosong, bukan undefined", () => {
    const hasil = new AchievementModel({
      customer: 0,
      sales: 0,
    }).getAchievements();

    expect(hasil).toEqual([]);
    expect(Array.isArray(hasil)).toBe(true);
  });

  it("nilai negatif diperlakukan seperti nol", () => {
    expect(
      nama(new AchievementModel({ customer: -5, sales: -1_000_000 }))
    ).toEqual([]);
  });

  it("Infinity membuka seluruh pencapaian", () => {
    expect(
      new AchievementModel({
        customer: Infinity,
        sales: Infinity,
      }).getAchievements()
    ).toHaveLength(8);
  });

  /**
   * CACAT: nilai NaN menghapus seluruh pencapaian tanpa suara.
   *
   * Setiap perbandingan dengan NaN bernilai salah, termasuk `NaN >= 1`. Tidak
   * ada pemeriksaan masukan sama sekali di konstruktor maupun di
   * getAchievements.
   *
   * NaN sangat mudah muncul di repo ini: model-model lain membungkus nilai
   * dengan `Number(...)` tanpa penjagaan, sehingga kolom yang tidak ikut
   * termuat menghasilkan NaN. Bila angka semacam itu diteruskan ke sini,
   * seorang salesman yang sebenarnya berprestasi ditampilkan TANPA lencana
   * sama sekali — tidak bisa dibedakan dari salesman yang memang belum
   * mencapai apa pun, dan tidak ada galat apa pun yang menandai masalahnya.
   */
  it("CACAT: NaN menghasilkan larik kosong, sama seperti belum berprestasi", () => {
    const rusak = new AchievementModel({ customer: NaN, sales: NaN });
    const kosong = new AchievementModel({ customer: 0, sales: 0 });

    expect(rusak.getAchievements()).toEqual([]);
    expect(rusak.getAchievements()).toEqual(kosong.getAchievements());
  });

  /**
   * CACAT: nilai yang tidak dikirim juga menghasilkan larik kosong.
   *
   * Konstruktornya menyalin apa adanya tanpa nilai cadangan, dan
   * `undefined >= 1` bernilai salah. Sama seperti NaN, akibatnya adalah
   * lencana yang hilang diam-diam alih-alih galat yang bisa ditelusuri.
   */
  it("CACAT: bidang yang tidak dikirim membuat pencapaian hilang tanpa galat", () => {
    const m = new AchievementModel(
      {} as unknown as {
        customer: number;
        sales: number;
      }
    );

    expect(m.customer).toBeUndefined();
    expect(m.getAchievements()).toEqual([]);
  });

  /**
   * CACAT: nilai berupa teks justru DITERIMA dan dibandingkan.
   *
   * JavaScript memaksa teks menjadi angka pada operator `>=`, jadi teks
   * "10000000" lolos seolah angka. Kebetulan hasilnya benar di sini, tetapi
   * ini bukan hasil rancangan — teks yang tidak bisa diubah menjadi angka
   * akan diam-diam menjadi NaN dan menghapus semua lencana.
   */
  it("CACAT: teks angka lolos perbandingan, teks bukan angka menghapus semua", () => {
    const teksAngka = new AchievementModel({
      customer: 0,
      sales: "10000000" as unknown as number,
    });
    expect(nama(teksAngka)).toContain("OrdinarySales");

    const teksKotor = new AchievementModel({
      customer: 0,
      sales: "Rp10.000.000" as unknown as number,
    });
    expect(teksKotor.getAchievements()).toEqual([]);
  });
});

describe("Isi pencapaian yang dikembalikan", () => {
  it("mengembalikan objek lengkap, bukan sekadar nama", () => {
    const [a] = new AchievementModel({
      customer: 1,
      sales: 0,
    }).getAchievements();

    expect(a.name).toBe("Junior customer hunter");
    expect(a.shortName).toBe("JuniorCustomerHunter");
    expect(a.description).toBe("Acquired new customer");
    expect(a.minimum).toBe(1);
    expect(a.field).toBe("customer");
  });

  /**
   * CACAT: keterangan tertulis "more than" padahal syaratnya `>=`.
   *
   * Keterangan berbunyi "Sales value is more than 10.000.000 IDR" — lebih dari
   * sepuluh juta. Kodenya memakai `this.sales >= achievement.minimum`, jadi
   * penjualan yang TEPAT sepuluh juta sudah mendapat lencana itu, padahal
   * nilainya tidak "lebih dari" sepuluh juta.
   *
   * Selisihnya memang hanya satu nilai, tetapi akibatnya nyata bagi pemakai:
   * keterangan itu tampil apa adanya di layar sebagai penjelasan syarat. Dua
   * salesman yang membandingkan lencananya dengan keterangan yang tertulis
   * akan menemukan hasil yang tidak cocok, dan bila lencana ini dipakai
   * sebagai dasar bonus, sengketa perhitungannya tidak punya rujukan yang
   * tegas. Sama berlaku untuk "Acquired more than 50 new customer" yang
   * ternyata sudah diberikan tepat pada pelanggan ke-50.
   */
  it("CACAT: keterangan menjanjikan 'more than' tetapi diberikan tepat pada ambang", () => {
    const tepat = new AchievementModel({ customer: 50, sales: 10_000_000 });
    const daftar = tepat.getAchievements();

    const penjualan = daftar.find((a) => a.shortName === "OrdinarySales")!;
    expect(penjualan.description).toContain("more than 10.000.000");
    // Namun nilainya persis 10.000.000, bukan lebih.
    expect(tepat.sales).toBe(penjualan.minimum);

    const pelanggan = daftar.find((a) => a.shortName === "CustomerHunter")!;
    expect(pelanggan.description).toContain("more than 50");
    expect(tepat.customer).toBe(pelanggan.minimum);
  });

  /**
   * CACAT: yang dikembalikan adalah ACUAN ke objek konstanta yang sama.
   *
   * getAchievements memasukkan objek dari daftar konstanta langsung ke hasil
   * tanpa menyalinnya. Setiap pemanggil menerima objek yang SAMA persis di
   * memori, dan konstantanya bukan pembekuan (tidak ada Object.freeze).
   *
   * Akibatnya bagi pemakai: satu bagian kode yang mengubah objek hasil —
   * misalnya menerjemahkan keterangan ke bahasa Indonesia sebelum dikirim ke
   * klien, atau menambahkan bidang tanggal perolehan — mengubah daftar
   * konstanta untuk SELURUH proses. Salesman berikutnya yang meminta
   * pencapaiannya akan menerima nilai yang sudah tercemar itu, dan pencemaran
   * bertahan sampai server dijalankan ulang. Cacat semacam ini sangat sulit
   * ditelusuri karena gejalanya baru muncul pada permintaan yang tidak
   * berkaitan.
   */
  it("CACAT: hasil berbagi acuan dengan konstanta, perubahan merembet ke semua", () => {
    const asli = achievements.find((a) => a.shortName === "OrdinarySales")!;
    const keteranganAsli = asli.description;

    try {
      const hasil = new AchievementModel({
        customer: 0,
        sales: 10_000_000,
      }).getAchievements();

      // Objeknya sama persis, bukan salinan.
      expect(hasil[0]).toBe(asli);

      // Mengubah hasil satu pemanggil mencemari konstanta global...
      (hasil[0] as IAchievement).description = "Sudah diterjemahkan";

      // ...dan pemanggil berikutnya ikut menerima nilai yang tercemar.
      const berikutnya = new AchievementModel({
        customer: 0,
        sales: 20_000_000,
      }).getAchievements();
      expect(berikutnya[0].description).toBe("Sudah diterjemahkan");
    } finally {
      // Dipulihkan agar tidak merembet ke tes lain — persis masalah yang
      // dijelaskan di atas, hanya saja di sini kita tahu harus memulihkannya.
      asli.description = keteranganAsli;
    }
  });
});

describe("Konstruktor", () => {
  it("menyimpan kedua angka apa adanya", () => {
    const m = new AchievementModel({ customer: 12, sales: 34_000_000 });

    expect(m.customer).toBe(12);
    expect(m.sales).toBe(34_000_000);
    expect(m).toBeInstanceOf(AchievementModel);
  });

  it("getAchievements tidak mengubah keadaan objeknya", () => {
    const m = new AchievementModel({ customer: 60, sales: 0 });

    const pertama = nama(m);
    const kedua = nama(m);

    expect(pertama).toEqual(kedua);
    expect(m.customer).toBe(60);
  });
});
