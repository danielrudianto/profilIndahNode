import { readFileSync } from "fs";
import { join } from "path";

/**
 * Saldo berjalan kartu stok dihitung oleh MySQL, bukan oleh perulangan.
 *
 * Kedua jalur — reorderSince (dipanggil tiap dokumen berubah) dan reorder
 * (dipanggil saat aplikasi start) — dulu menarik seluruh baris terpengaruh
 * lalu mengirim satu UPDATE per baris. reorderSince bahkan memakai `await`
 * di dalam perulangan, jadi pulang-pergi jaringannya berurutan. Pada produk
 * tersibuk basis data ini kartunya 20.087; satu faktur bertanggal mundur
 * memicu belasan ribu pulang-pergi sebelum kasir melihat konfirmasi.
 *
 * YANG DIJAGA tes ini hanyalah BENTUK kuerinya, bukan angkanya. Ia membaca
 * berkas sumber; MySQL tidak tersedia di jajaran uji ini. Kesetaraan hasilnya
 * dibuktikan terpisah: uji beda atas 1.917 baris acak terhadap simulasi
 * perulangan lama menghasilkan selisih nol, dan bentuk baca-saja dari kueri
 * yang sama dijalankan langsung di basis data produksi atas 1,13 juta baris
 * — juga nol selisih terhadap saldo yang tersimpan.
 */
describe("saldo berjalan kartu stok dihitung di basis data", () => {
  const berkas = join(
    __dirname,
    "..",
    "..",
    "src",
    "repositories",
    "stock-card.repository.ts",
  );
  const isi = readFileSync(berkas, "utf8");

  /** Memotong satu metode dari kelasnya, sampai metode berikutnya. */
  const metode = (nama: string): string => {
    const mulai = isi.indexOf(`async ${nama}(`);
    expect(mulai).toBeGreaterThan(-1);
    const sisa = isi.slice(mulai + 1);
    const berikut = sisa.search(/\n {2}(?:async |\/\*\*)/);
    return berikut === -1 ? sisa : sisa.slice(0, berikut);
  };

  describe.each(["reorderSince", "reorder"])("%s", (nama) => {
    it("memakai fungsi jendela, bukan perulangan UPDATE", () => {
      const m = metode(nama);

      expect(m).toMatch(/SUM\s*\(\s*quantity\s*\)\s*OVER/i);
      expect(m).toMatch(/ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW/i);
    });

    /*
      Urutan `date, id` adalah satu-satunya yang membuat saldo deterministik
      ketika beberapa dokumen berbagi satu tanggal — dan itu lazim di sini.
      Menghapus `id` dari urutannya mengubah 102 dari 1.917 baris pada uji
      beda; kerusakan yang tidak menimbulkan galat apa pun.
    */
    it("mengurutkan jendela menurut date lalu id", () => {
      const m = metode(nama);

      expect(m).toMatch(/ORDER BY\s+date\s+ASC\s*,\s*id\s+ASC/i);
    });

    it("tidak lagi memanggil stock_card.update di dalam perulangan", () => {
      const m = metode(nama);

      expect(m).not.toMatch(/stock_card\.update\(/);
    });

    /*
      Parameter dikirim lewat penjepit $executeRaw, bukan dirangkai ke dalam
      teks kueri. Perangkaian akan membuka celah injeksi sekaligus mematikan
      cache rencana kueri.
    */
    it("mengirim parameter lewat penjepit, bukan merangkai teks", () => {
      const m = metode(nama);

      expect(m).toMatch(/\$executeRaw`/);
      expect(m).not.toMatch(/\$executeRawUnsafe/);
    });
  });

  /**
   * reorderSince menerima saldo baris JANGKAR yang berada tepat sebelum
   * rentangnya, dan jangkar itu sengaja tidak ikut dihitung ulang. Nilainya
   * harus ditambahkan sebagai konstanta di luar jendela; menyertakannya ke
   * dalam partisi akan menghitung kuantitasnya dua kali.
   */
  it("reorderSince menambahkan saldo jangkar di luar jendela", () => {
    const m = metode("reorderSince");

    expect(m).toMatch(/\$\{data\.initial_stock\}\s*\+\s*SUM\s*\(/);
  });

  /**
   * Rentangnya harus sama persis dengan findMany yang digantikan: baris
   * setelah tanggal jangkar, ditambah baris pada tanggal yang sama yang
   * id-nya tidak lebih kecil dari jangkar. Kehilangan cabang kedua membuat
   * dokumen yang berbagi tanggal dengan jangkar tidak pernah dihitung ulang.
   */
  it("reorderSince menjaga kedua cabang syarat rentangnya", () => {
    const m = metode("reorderSince");

    expect(m).toMatch(/date\s*>\s*\$\{sejakTanggal\}/);
    expect(m).toMatch(/date\s*=\s*\$\{sejakTanggal\}\s*AND\s*id\s*>=/);
  });

  /**
   * reorder berjalan per produk, bukan satu pernyataan untuk seluruh tabel.
   *
   * Bentuk seluruh tabel memang jalan — tiga setengah detik untuk 1,13 juta
   * baris — tetapi memegang kunci selama itu, sementara aplikasi bisa
   * dihidupkan kapan saja termasuk di tengah jam toko.
   */
  it("reorder menyaring per produk", () => {
    const m = metode("reorder");

    expect(m).toMatch(/WHERE product_id = \$\{product_id\}/);
  });

  /*
    Falsifikasi. Pemotong metode yang salah akan membuat seluruh harapan di
    atas diperiksa terhadap teks yang keliru — dan tetap lolos.
  */
  it("pemotong metodenya benar-benar memisahkan keduanya", () => {
    const sejak = metode("reorderSince");
    const penuh = metode("reorder");

    expect(sejak).toContain("initial_stock");
    expect(penuh).not.toContain("initial_stock");
    expect(penuh).toContain("productIDs");
    expect(sejak).not.toContain("productIDs");
  });
});
