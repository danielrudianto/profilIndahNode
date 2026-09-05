import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Penyapu: tidak boleh ada controller yang membaca `req.body.role` sebagai
 * IDENTITAS pemanggil.
 *
 * Sejak peran pemanggil pindah ke `callerRole`, `req.body.role` bisa berisi
 * apa pun yang dikirim client — itulah yang membuat formulir pengguna kembali
 * bisa mengirim peran tujuan. Konsekuensinya: siapa pun yang membacanya untuk
 * mengambil KEPUTUSAN IZIN sekarang bisa dibohongi.
 *
 * Sebelum perubahan itu, jaminannya dipegang oleh penimpaan di middleware.
 * Sekarang jaminannya dipegang tes ini. Kalau ia dihapus, tidak ada lagi yang
 * menahan seseorang menulis `if (req.body.role === 7)` di controller baru —
 * dan lubang seperti itu tidak menimbulkan galat apa pun.
 *
 * Dua pembaca yang tersisa DIIZINKAN dengan nama terang di bawah, karena
 * keduanya memperlakukan nilainya sebagai DATA KIRIMAN, bukan identitas:
 * peran tujuan pada pembuatan dan penyuntingan pengguna.
 */
describe("req.body.role tidak dipakai sebagai identitas pemanggil", () => {
  const akar = join(__dirname, "..", "..", "src", "controllers");

  /**
   * Baris yang boleh membaca req.body.role, beserta alasannya.
   *
   * Disebutkan sebagai pasangan berkas dan potongan barisnya, bukan sekadar
   * nama berkas: mengizinkan seluruh berkas berarti pembaca BARU di berkas
   * yang sama ikut lolos tanpa ada yang menyadarinya.
   */
  const DIIZINKAN = [
    {
      berkas: "user.controller.ts",
      potongan: "const roleID = Number(req.body.role)",
      alasan: "peran tujuan yang dipilih di formulir pembuatan pengguna",
    },
    {
      berkas: "user.controller.ts",
      potongan: "const role = req.body.role",
      alasan: "peran tujuan pada penyuntingan pengguna",
    },
  ];

  const berkasController = readdirSync(akar).filter((x) =>
    x.endsWith(".controller.ts"),
  );

  it("menemukan berkas controller untuk diperiksa", () => {
    expect(berkasController.length).toBeGreaterThan(0);
  });

  it("tidak ada pembaca req.body.role di luar daftar yang diizinkan", () => {
    const pelanggar: string[] = [];

    for (const nama of berkasController) {
      const baris = readFileSync(join(akar, nama), "utf8").split("\n");

      baris.forEach((b, i) => {
        if (!b.includes("req.body.role")) {
          return;
        }
        /* Komentar bukan kode; menyebut namanya dalam penjelasan tidak apa-apa. */
        const dipangkas = b.trim();
        if (dipangkas.startsWith("*") || dipangkas.startsWith("//")) {
          return;
        }

        const diizinkan = DIIZINKAN.some(
          (d) => d.berkas === nama && b.includes(d.potongan),
        );
        if (!diizinkan) {
          pelanggar.push(`${nama}:${i + 1}: ${dipangkas}`);
        }
      });
    }

    expect(pelanggar).toEqual([]);
  });

  /*
    Falsifikasi. Penyapu yang tidak pernah menemukan apa pun mungkin memang
    buta — satu tanda yang salah pada pencocokannya akan lolos selamanya tanpa
    memberi tahu siapa pun.
  */
  it("penyapunya benar-benar bisa menemukan pembaca baru", () => {
    const rusak = [
      "  const peran = req.body.role;",
      "  if (peran !== 7) return res.status(403).send('Forbidden');",
    ];

    const ketemu = rusak.filter(
      (b) =>
        b.includes("req.body.role") &&
        !DIIZINKAN.some((d) => b.includes(d.potongan)),
    );

    expect(ketemu.length).toBe(1);
  });

  it("setiap entri yang diizinkan memang masih ada di kodenya", () => {
    const hilang = DIIZINKAN.filter((d) => {
      const isi = readFileSync(join(akar, d.berkas), "utf8");
      return !isi.includes(d.potongan);
    }).map((d) => `${d.berkas}: ${d.potongan}`);

    /*
      Daftar pengecualian yang isinya sudah tidak ada di kode adalah izin yang
      menganggur — ia akan meloloskan pembaca baru yang kebetulan ditulis
      dengan kalimat yang sama.
    */
    expect(hilang).toEqual([]);
  });
});
