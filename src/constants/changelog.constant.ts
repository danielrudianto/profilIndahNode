/**
 * Riwayat perubahan aplikasi.
 *
 * Dulu disimpan di MongoDB (koleksi `changelogs`), tetapi koneksi Mongo tidak
 * pernah dibuka sehingga endpoint /changelog selalu gagal. Isinya diisi manual
 * dan jarang berubah, jadi tidak perlu basis data tersendiri — cukup berkas ini.
 *
 * Menambah entri: taruh yang terbaru di ATAS. Endpoint mengirim isi berkas ini
 * apa adanya, dengan bentuk yang sama seperti dokumen Mongo sebelumnya
 * (`date` + `changes`), supaya tampilan di frontend tidak berubah.
 */
export interface ChangelogEntry {
  date: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "2026-08-14",
    changes: [
      "Validasi permintaan dipindahkan ke skema Zod.",
      "MongoDB dilepas; seluruh data kini di MySQL dan Redis.",
      "Penataan ulang direktori src/ dan penambahan pemeriksaan otorisasi route.",
    ],
  },
];

export default changelog;
