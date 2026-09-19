import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Penjaga: nilai tingkat NOTA tidak boleh dijumlahkan di dalam kueri yang
 * digerakkan dari tabel BARIS.
 *
 * `sales_invoice` menyimpan barisnya, `sales_invoice_code` menyimpan notanya.
 * Sebuah SELECT yang berjalan `FROM sales_invoice JOIN sales_invoice_code`
 * memunculkan satu nota sebanyak jumlah barisnya — jadi SUM atas kolom milik
 * nota (diskon, jasa, ongkos kirim, biaya admin) menghitungnya berulang kali,
 * dan COUNT atas notanya menghitung baris.
 *
 * Bentuk itu juga MEMBUANG nota yang tidak punya baris sama sekali. Faktur
 * jasa murni berbentuk begitu; pada September 2026 saja dua belas dokumen
 * semacam itu membawa 125 juta jasa yang tidak pernah muncul di laporan.
 *
 * Tiga kesalahan, satu sebab. Karena itu yang dijaga di sini adalah SEBABNYA:
 * dua tingkat tidak boleh dijumlahkan dalam kueri yang sama.
 *
 * YANG DIJAGA hanyalah bentuk kuerinya, bukan hasilnya. Tes ini membaca
 * berkas sumber; MySQL tidak tersedia di jajaran uji ini. Jadi ia menahan
 * kemunduran, bukan membuktikan angkanya benar.
 */
describe("nilai nota tidak dijumlahkan dalam kueri tabel baris", () => {
  const akar = join(__dirname, "..", "..", "src", "repositories");

  /** Kolom yang dimiliki NOTA, bukan baris. */
  const KOLOM_NOTA = ["discount", "service", "delivery", "admin_fee"];

  /**
   * Memotong berkas menjadi blok-blok $queryRaw.
   *
   * Dipotong per blok, bukan diperiksa per berkas: satu repository memuat
   * banyak kueri, dan sebagian memang sah menjumlahkan nilai baris sementara
   * yang lain sah menjumlahkan nilai nota. Yang terlarang adalah keduanya
   * BERSAMAAN di dalam satu kueri.
   */
  const blokKueri = (isi: string): string[] => {
    const blok: string[] = [];
    const pola = /\$queryRaw(?:Unsafe)?[\s\S]{0,40}?`([\s\S]*?)`/g;
    let m: RegExpExecArray | null;
    while ((m = pola.exec(isi)) !== null) {
      blok.push(m[1]);
    }
    return blok;
  };

  /** Kueri ini berjalan dari tabel baris dan menyambung ke tabel nota. */
  const dariTabelBaris = (q: string): boolean =>
    /FROM\s+sales_invoice\b(?!_)/i.test(q) &&
    /JOIN\s+sales_invoice_code\b/i.test(q);

  const menjumlahNilaiNota = (q: string): string[] =>
    KOLOM_NOTA.filter((k) =>
      new RegExp(`SUM\\s*\\(\\s*sales_invoice_code\\.${k}\\s*\\)`, "i").test(q),
    );

  const berkas = readdirSync(akar).filter((x) => x.endsWith(".repository.ts"));

  it("menemukan berkas repository untuk diperiksa", () => {
    expect(berkas.length).toBeGreaterThan(0);
  });

  it("tidak ada kueri yang mencampur kedua tingkat", () => {
    const pelanggar: string[] = [];

    for (const nama of berkas) {
      const isi = readFileSync(join(akar, nama), "utf8");
      for (const q of blokKueri(isi)) {
        if (!dariTabelBaris(q)) {
          continue;
        }
        const kolom = menjumlahNilaiNota(q);
        if (kolom.length > 0) {
          pelanggar.push(`${nama}: SUM atas ${kolom.join(", ")}`);
        }
      }
    }

    expect(pelanggar).toEqual([]);
  });

  /**
   * COUNT atas nota di dalam kueri tabel baris menghitung BARIS.
   *
   * Dijaga terpisah karena gejalanya berbeda: yang ini tidak menggelembungkan
   * rupiah, melainkan membuat "jumlah faktur" di laporan menjadi jumlah baris
   * barang — 18.423 padahal notanya 7.502.
   */
  it("tidak ada COUNT atas nota di dalam kueri tabel baris", () => {
    const pelanggar: string[] = [];

    for (const nama of berkas) {
      const isi = readFileSync(join(akar, nama), "utf8");
      for (const q of blokKueri(isi)) {
        if (!dariTabelBaris(q)) {
          continue;
        }
        if (/COUNT\s*\(\s*sales_invoice_code\.id\s*\)/i.test(q)) {
          pelanggar.push(`${nama}: COUNT(sales_invoice_code.id)`);
        }
      }
    }

    expect(pelanggar).toEqual([]);
  });

  /*
    Falsifikasi. Penyapu yang tidak pernah menemukan apa pun mungkin memang
    buta — satu tanda yang salah pada pencocokannya akan lolos selamanya.
  */
  it("penyapunya benar-benar mengenali bentuk yang salah", () => {
    const rusak = `
      SELECT SUM(sales_invoice.quantity * sales_invoice.price) AS value,
      SUM(sales_invoice_code.service) AS service,
      COUNT(sales_invoice_code.id) AS salesInvoiceCount
      FROM sales_invoice
      JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
    `;

    expect(dariTabelBaris(rusak)).toBe(true);
    expect(menjumlahNilaiNota(rusak)).toEqual(["service"]);
  });

  it("penyapunya membiarkan kueri yang sudah dipisah", () => {
    const benar = `
      SELECT SUM(sales_invoice_code.service) AS service,
      COUNT(sales_invoice_code.id) AS salesInvoiceCount
      FROM sales_invoice_code
      WHERE sales_invoice_code.is_delete = 0
    `;

    /* Berjalan dari tabel nota, jadi tidak pernah diperiksa. */
    expect(dariTabelBaris(benar)).toBe(false);
  });

  it("memotong berkas menjadi blok kueri yang terpisah", () => {
    const dua = [
      "const a = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM sales_invoice`;",
      "const b = await this.prisma.$queryRaw<any[]>`SELECT 2 FROM sales_invoice_code`;",
    ].join("\n");

    const blok = blokKueri(dua);
    expect(blok.length).toBe(2);
    expect(blok[0]).toContain("SELECT 1");
    expect(blok[1]).toContain("SELECT 2");
  });
});
