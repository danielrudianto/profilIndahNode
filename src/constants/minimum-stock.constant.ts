/* Kunci Redis cap waktu terakhir rekomendasi stok minimum dihitung. */
export const MINIMUM_STOCK_LAST_CALCULATED = "minimum-stock:last-calculated";

/**
 * Tiga keadaan stok pada Daftar Stok, DAN potongan SQL-nya.
 *
 * Dulu hanya ada dua, dan "menipis" memakai ambang gabungan
 * GREATEST(minimum_stock, rekomendasi). Itu mencampur dua hal yang berbeda
 * asalnya: ambang yang DISET ORANG dan ambang yang DITEBAK SISTEM dari pola
 * penjualan. Bagian pembelian memperlakukan keduanya sama, padahal yang satu
 * keputusan dan yang satu perkiraan.
 *
 * Maka dipecah, dan dipecah SALING LEPAS — sebuah barang tidak pernah masuk
 * dua keadaan sekaligus:
 *
 *   minus          stok < 0
 *   menipis        stok < minimum_stock manual
 *   menipis_teori  stok sudah >= ambang manual, tetapi masih < rekomendasi
 *
 * Jumlah `menipis` dan `menipis_teori` persis sama dengan angka "menipis"
 * yang lama, jadi tidak ada barang yang hilang dari pengawasan — hanya
 * terbagi menurut siapa yang menyatakannya kurang.
 *
 * KENAPA SQL-NYA DI SINI. Angka pada chip dan isi daftar ketika chip itu
 * ditekan harus berasal dari definisi yang SAMA PERSIS. Ketika keduanya
 * ditulis terpisah, chip pernah menghitung dengan satu ambang sementara
 * daftarnya menyaring dengan ambang lain, dan hasilnya daftar yang isinya
 * membantah angkanya sendiri. Satu sumber, dipakai dua-duanya.
 *
 * Tidak ada nilai dari pengguna yang masuk ke sini: isinya tetapan beku, dan
 * kuncinya bertipe union sehingga TypeScript menolak kunci lain. Keempat
 * pemakaiannya tercatat di scripts/sql-injection-baseline.txt.
 */
export type KeadaanStok = "low" | "low-theory" | "negative";

/** Stok tidak pernah dianggap menipis ketika sudah minus — itu keadaan lain. */
const TIDAK_MINUS = "COALESCE(product_stock.stock, 0) >= 0";

export const KLAUSA_KEADAAN: Readonly<Record<KeadaanStok, string>> =
  Object.freeze({
    low: `${TIDAK_MINUS} AND COALESCE(product_stock.stock, 0) < product.minimum_stock`,
    /*
      Batas bawahnya WAJIB ada. Tanpa `>= product.minimum_stock`, barang yang
      di bawah kedua ambang akan terhitung pada dua chip sekaligus, dan
      penjumlahan ketiganya melampaui jumlah barang yang sebenarnya.
    */
    "low-theory": `${TIDAK_MINUS} AND COALESCE(product_stock.stock, 0) >= product.minimum_stock AND COALESCE(product_stock.stock, 0) < COALESCE(product.minimum_stock_recommendation, 0)`,
    negative: "COALESCE(product_stock.stock, 0) < 0",
  });
