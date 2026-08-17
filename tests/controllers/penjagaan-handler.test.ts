import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Penjagaan struktural atas seluruh handler controller.
 *
 * Berkas ini tidak menguji satu controller tertentu; ia memeriksa pola yang
 * berlaku di semuanya. Dua cacat yang sudah ditambal berasal dari pola yang
 * sama, dan keduanya baru ketahuan setelah tesnya MENGGANTUNG — bukan gagal:
 *
 *   Handler `async` yang melempar menghasilkan promise yang ditolak. Express 4
 *   tidak menanganinya, dan Node menghentikan seluruh proses.
 *
 *   translateKeyword dulu melempar untuk kata kunci berisi "%" dan dipanggil
 *   di luar blok try pada dua puluh empat handler.
 *
 * Keduanya kini tertutup: utils/async-error.helper.ts menangkap penolakan
 * promise di tingkat router, dan translateKeyword tidak lagi melempar. Berkas
 * ini menjaga kedua tambalan itu tetap terpasang, karena bila salah satunya
 * lepas, gejalanya bukan tes yang gagal melainkan server yang mati di produksi.
 */

const AKAR = join(__dirname, "..", "..", "src");

function baca(jalur: string): string {
  return readFileSync(jalur, "utf8");
}

describe("Tambalan penangkap galat async terpasang", () => {
  const app = baca(join(AKAR, "app.ts"));

  it("app.ts mengimpor async-error.helper", () => {
    expect(app).toContain("./utils/async-error.helper");
  });

  /**
   * Urutannya menentukan berhasil tidaknya. Pemanggilan router.get(...) di
   * berkas route berjalan ketika modulnya diimpor, jadi tambalan yang diimpor
   * belakangan akan selalu terlambat — seluruh route sudah telanjur terdaftar
   * dengan handler yang belum terbungkus.
   */
  it("impornya berada sebelum impor route mana pun", () => {
    const posisiTambalan = app.indexOf("./utils/async-error.helper");
    const posisiRoutePertama = app.indexOf('from "./routes/');

    expect(posisiTambalan).toBeGreaterThanOrEqual(0);
    expect(posisiRoutePertama).toBeGreaterThanOrEqual(0);
    expect(posisiTambalan).toBeLessThan(posisiRoutePertama);
  });

  it("app.ts tetap punya penangkap galat empat argumen di paling akhir", () => {
    // Express mengenali penangkap galat HANYA dari jumlah parameternya.
    expect(app).toMatch(
      /error:\s*Error,[\s\S]*?_next:\s*express\.NextFunction/
    );
  });
});

describe("translateKeyword tidak boleh melempar lagi", () => {
  const escape = baca(join(AKAR, "utils", "escape.helper.ts"));

  it("decodeURIComponent dibungkus try/catch", () => {
    const fungsi = escape.slice(
      escape.indexOf("export function translateKeyword"),
      escape.indexOf("export function translatePage")
    );

    expect(fungsi).toContain("decodeURIComponent");
    expect(fungsi).toContain("try");
    expect(fungsi).toContain("catch");
  });
});

/**
 * Daftar handler yang menunggu repository tanpa try/catch.
 *
 * Setelah tambalan router terpasang, handler semacam itu tidak lagi mematikan
 * proses — penolakannya menjadi 500 yang rapi. Tetapi 500 itu berisi pesan
 * umum, bukan key i18n milik domainnya, dan tidak ada catatan konsol yang
 * menyebut handler mana yang gagal.
 *
 * Angkanya dicatat sebagai batas atas, bukan nol: menambahkan try/catch pada
 * dua belas handler sekaligus mengubah pesan yang diterima frontend, dan itu
 * keputusan tersendiri. Yang dijaga di sini adalah jumlahnya tidak BERTAMBAH.
 */
describe("Handler async tanpa try/catch tidak boleh bertambah", () => {
  const BATAS = 10;

  function hitungTanpaTry(): string[] {
    const hasil: string[] = [];

    for (const berkas of readdirSync(join(AKAR, "controllers"))) {
      if (!berkas.endsWith(".ts")) continue;
      const isi = baca(join(AKAR, "controllers", berkas));
      const re = /^  (\w+) = async \([^)]*\) => \{/gm;
      let m: RegExpExecArray | null;

      while ((m = re.exec(isi)) !== null) {
        let i = isi.indexOf("{", m.index);
        let dalam = 1;
        const mulai = i;
        i++;
        while (i < isi.length && dalam > 0) {
          if (isi[i] === "{") dalam++;
          else if (isi[i] === "}") dalam--;
          i++;
        }
        const badan = isi.slice(mulai, i);
        const menungguRepository = /await\s+this\.\w+/.test(badan);
        const punyaTry = /\btry\s*\{/.test(badan);

        if (menungguRepository && !punyaTry) {
          hasil.push(`${berkas.replace(".controller.ts", "")}.${m[1]}`);
        }
      }
    }

    return hasil;
  }

  it(`jumlahnya tidak melebihi ${BATAS}`, () => {
    const daftar = hitungTanpaTry();

    // Bila jumlahnya bertambah, yang ditampilkan adalah DAFTARNYA — bukan
    // sekadar angka — supaya yang menambah handler baru langsung tahu
    // punyanya yang mana. Saat lolos, kedua ruas sama-sama daftar penuh.
    expect(daftar.length > BATAS ? daftar : "dalam batas").toEqual(
      "dalam batas"
    );
  });

  it("daftarnya cocok dengan yang tercatat saat penjagaan ini dibuat", () => {
    // Kalau salah satu handler di bawah ini kelak diberi try/catch, tes ini
    // gagal dan BATAS di atas harus ikut diturunkan — supaya penjagaannya
    // tidak diam-diam melonggar seiring kode membaik.
    expect(hitungTanpaTry().sort()).toEqual(
      [
        "company.fetchByID",
        "money-receipt.fetchDorMoneyReceipt",
        "product-brand.create",
        "promotion.downloadPurchaseResultByID",
        "promotion.downloadSalesResultByID",
        "promotion.fetchResult",
        "sales.deleteSalesman",
        "sales.fetch",
        "sales.fetchAll",
        "supplier.create",
      ].sort()
    );
  });
});
