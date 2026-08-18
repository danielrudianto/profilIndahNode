/**
 * Daftar BAKU tipe pengeluaran.
 *
 * Tipe pengeluaran tidak lagi ditambah lewat antarmuka — pemilik memutuskan
 * daftarnya datar dan terkendali supaya laporan tidak beranak-pinak. Mengubah
 * daftar ini adalah keputusan sadar: tambahkan barisnya di sini, lalu jalankan
 * `npm run start:seed-expense-type`. Seeder mencocokkan berdasarkan NAMA dan
 * tidak pernah menghapus tipe yang sudah dipakai catatan pengeluaran.
 */
export const EXPENSE_TYPE_SEED: { name: string; description: string }[] = [
  {
    name: "Transportasi",
    description: "Bensin, parkir, tol, dan ongkos kirim.",
  },
  { name: "Gaji & upah", description: "Gaji karyawan, lembur, dan bonus." },
  { name: "Listrik & air", description: "Tagihan listrik, air, dan gas toko." },
  {
    name: "Telepon & internet",
    description: "Pulsa, paket data, dan langganan internet.",
  },
  { name: "Sewa", description: "Sewa toko, gudang, atau kendaraan." },
  {
    name: "Perlengkapan toko",
    description: "ATK, kantong, tali, dan perlengkapan habis pakai.",
  },
  {
    name: "Perawatan & perbaikan",
    description: "Servis kendaraan, mesin, dan perbaikan bangunan.",
  },
  { name: "Konsumsi", description: "Makan minum karyawan dan jamuan tamu." },
  {
    name: "Pajak & retribusi",
    description: "Pajak daerah, retribusi, dan iuran lingkungan.",
  },
  { name: "Lain-lain", description: "Pengeluaran di luar tipe yang tersedia." },
];
