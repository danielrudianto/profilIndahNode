/*
  Alokasi diskon faktur ke baris — bahan HPP.

  Diskon pada level dokumen (good_receipt_code.discount) harus menurunkan
  harga pokok lapisan stok, bukan berhenti sebagai angka di dokumen.
  Pembagiannya pro-rata terhadap nilai bersih tiap baris; sisa pembulatan
  dilempar ke baris bernilai terbesar supaya jumlah alokasi persis sama
  dengan diskonnya.
*/

/**
 * Bagi `diskon` ke tiap baris sebanding `nilaiBaris` (nilai bersih baris:
 * (harga - diskon barang) * kuantitas, dalam satuan dokumen).
 *
 * Mengembalikan larik alokasi rupiah sepanjang masukan, dibulatkan dua
 * desimal, dengan jumlah yang persis sama dengan `diskon`. Diskon nol,
 * negatif, atau total baris nol menghasilkan alokasi nol semua — pemanggil
 * yang menolak diskon melebihi total, di sini hanya matematika.
 */
export function alokasiDiskonFaktur(
  nilaiBaris: number[],
  diskon: number
): number[] {
  const total = nilaiBaris.reduce((a, b) => a + b, 0);
  if (!(diskon > 0) || !(total > 0)) {
    return nilaiBaris.map(() => 0);
  }

  const bulatkan = (n: number) => Math.round(n * 100) / 100;
  const alokasi = nilaiBaris.map((nilai) => bulatkan((diskon * nilai) / total));

  /* Sisa pembulatan ke baris terbesar — totalnya wajib persis. */
  const terpakai = alokasi.reduce((a, b) => a + b, 0);
  const sisa = bulatkan(diskon - terpakai);
  if (sisa !== 0) {
    let indeksTerbesar = 0;
    for (let i = 1; i < nilaiBaris.length; i++) {
      if (nilaiBaris[i] > nilaiBaris[indeksTerbesar]) {
        indeksTerbesar = i;
      }
    }
    alokasi[indeksTerbesar] = bulatkan(alokasi[indeksTerbesar] + sisa);
  }

  return alokasi;
}
