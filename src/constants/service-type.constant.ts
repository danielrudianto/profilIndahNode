/**
 * Jenis jasa yang boleh dicantumkan pada faktur penjualan.
 *
 * Sengaja konstanta, BUKAN tabel master. Isinya tiga dan sudah begitu
 * bertahun-tahun, sementara data master yang bisa diisi tangan di sistem ini
 * terbukti selalu kembar — produksi punya tipe barang `LIGHTING` dua biji dan
 * `"jasa "` dua biji dengan spasi di belakang. Jasa keempat berarti satu baris
 * di sini ditambah satu deploy; murah untuk sesuatu yang berubah sekali dalam
 * beberapa tahun, dan sebagai gantinya "CNC" tidak akan pernah ada dua.
 *
 * NILAI-nya yang tersimpan di basis data, bukan angka urut. Laporan keuangan
 * ditulis dengan SQL mentah, dan `service_type = 'CNC'` bisa dibaca siapa pun
 * yang membuka basis datanya — sementara `service_type = 2` menuntut orang itu
 * menemukan berkas ini lebih dulu.
 */
export enum ServiceType {
  CNC = "CNC",
  Frame = "FRAME",
  Solid = "SOLID",
}

/** Urutan tampil di layar faktur; juga dipakai penjaga validasi. */
export const SERVICE_TYPES: ServiceType[] = [
  ServiceType.CNC,
  ServiceType.Frame,
  ServiceType.Solid,
];
