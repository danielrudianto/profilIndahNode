/*
  Umur cache Redis untuk laporan yang mahal dihitung (menyisir jutaan
  baris stock_out). Lima menit: cukup panjang supaya klik bolak-balik
  tanggal terasa instan, cukup pendek supaya dokumen susulan tidak lama
  tersembunyi.
*/
export const UMUR_CACHE_LAPORAN = 300;
