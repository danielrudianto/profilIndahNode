import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Penjaga: agregat baris `sales_invoice` TIDAK boleh disambung dengan INNER
 * JOIN.
 *
 * Faktur jasa murni — jasa dan/atau ongkos kirim tanpa satu pun barang —
 * tidak punya baris di `sales_invoice`. INNER JOIN ke agregat baris membuang
 * faktur seperti itu dari hasil: bukan menilainya nol, melainkan
 * MENGHILANGKANNYA. Akibatnya tagihannya tidak pernah muncul di daftar
 * piutang, tidak ada galat, dan tidak ada yang menagihnya.
 *
 * Lima tempat pernah memakai pola itu: tiga di receivable.repository.ts, satu
 * di customer.repository.ts, satu di sales-invoice-payment.repository.ts.
 *
 * YANG DIJAGA TES INI hanyalah bentuk kuerinya, bukan hasilnya. Ia membaca
 * berkas sumber, bukan menjalankan SQL — MySQL tidak tersedia di jajaran uji
 * ini. Jadi ia menahan kemunduran ("seseorang menulis JOIN lagi"), bukan
 * membuktikan angkanya benar. Pembuktian angka menuntut basis data sungguhan
 * dan dikerjakan terpisah.
 */
describe("agregat baris faktur disambung dengan LEFT JOIN", () => {
  const akar = join(__dirname, "..", "..", "src", "repositories");

  /**
   * Menangkap `JOIN (SELECT ... FROM sales_invoice ...) AS alias`, dan
   * membedakan LEFT dari INNER lewat kelompok pertama.
   *
   * Dibatasi jaraknya (400/300 aksara) supaya tidak melompati batas satu
   * subkueri ke subkueri berikutnya pada berkas yang memuat banyak.
   *
   * `[\s\S]` dipakai, bukan `.` dengan tanda `s`: target proyek ini es2017
   * dan tanda itu baru ada sejak es2018. Menaikkan target demi satu tes bukan
   * pertukaran yang pantas.
   */
  const polaBaru = () =>
    /(LEFT JOIN|JOIN)\s*\(\s*SELECT([\s\S]{0,400}?)FROM sales_invoice\b([\s\S]{0,300}?)\)\s*AS\s+(\w+)/g;

  const temuan = (isi: string): { jenis: string; alias: string }[] => {
    const hasil: { jenis: string; alias: string }[] = [];
    const pola = polaBaru();
    let m: RegExpExecArray | null;
    while ((m = pola.exec(isi)) !== null) {
      hasil.push({ jenis: m[1], alias: m[4] });
    }
    return hasil;
  };

  const berkas = readdirSync(akar).filter((x) => x.endsWith(".repository.ts"));

  it("menemukan berkas repository untuk diperiksa", () => {
    expect(berkas.length).toBeGreaterThan(0);
  });

  it("tidak menyisakan satu pun INNER JOIN ke agregat sales_invoice", () => {
    const pelanggar: string[] = [];

    for (const nama of berkas) {
      const isi = readFileSync(join(akar, nama), "utf8");
      for (const t of temuan(isi)) {
        if (t.jenis === "JOIN") {
          pelanggar.push(`${nama} (alias ${t.alias})`);
        }
      }
    }

    expect(pelanggar).toEqual([]);
  });

  /*
    Falsifikasi. Pemeriksa yang tidak pernah menemukan apa pun mungkin memang
    buta — regex yang salah satu tanda akan lolos di atas selamanya tanpa
    memberi tahu siapa pun. Di sini polanya diberi kerusakan buatan dan HARUS
    menemukannya.
  */
  it("polanya benar-benar bisa menemukan INNER JOIN", () => {
    const rusak = `
      FROM sales_invoice_code
      JOIN (
        SELECT SUM(sales_invoice.quantity) AS value, sales_invoice.sales_invoice_code_id
        FROM sales_invoice
        GROUP BY sales_invoice.sales_invoice_code_id
      ) AS si ON sales_invoice_code.id = si.sales_invoice_code_id
    `;

    expect(temuan(rusak)).toEqual([{ jenis: "JOIN", alias: "si" }]);
  });

  it("polanya membedakan LEFT JOIN dari INNER JOIN", () => {
    const benar = `
      FROM sales_invoice_code
      LEFT JOIN (
        SELECT SUM(sales_invoice.quantity) AS value, sales_invoice.sales_invoice_code_id
        FROM sales_invoice
        GROUP BY sales_invoice.sales_invoice_code_id
      ) AS si ON sales_invoice_code.id = si.sales_invoice_code_id
    `;

    expect(temuan(benar)).toEqual([{ jenis: "LEFT JOIN", alias: "si" }]);
  });

  /*
    LEFT JOIN saja belum cukup. Tanpa COALESCE, nilai NULL dari sisi kanan
    merambat: `NULL + delivery + service` menghasilkan NULL, bukan jumlah
    biayanya — dan faktur jasa yang tadinya hilang berganti menjadi faktur
    bernilai kosong. Dua setengah perbaikan lebih buruk daripada satu, karena
    yang kedua tidak kelihatan.
  */
  it("setiap alias agregat dibungkus COALESCE saat dipakai berhitung", () => {
    const kurang: string[] = [];

    for (const nama of berkas) {
      const isi = readFileSync(join(akar, nama), "utf8");
      for (const t of temuan(isi)) {
        /*
          Setiap pemakaian `alias.value` diperiksa satu per satu: yang berada
          tepat di belakang "COALESCE(" aman, sisanya tidak. Lookbehind tidak
          dipakai karena juga baru ada sejak es2018.
        */
        const pola = new RegExp(`\\b${t.alias}\\.value\\b`, "g");
        let m: RegExpExecArray | null;
        while ((m = pola.exec(isi)) !== null) {
          const sebelum = isi.slice(Math.max(0, m.index - 9), m.index);
          if (sebelum !== "COALESCE(") {
            kurang.push(`${nama} (alias ${t.alias})`);
            break;
          }
        }
      }
    }

    expect(kurang).toEqual([]);
  });
});
