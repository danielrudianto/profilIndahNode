import { Meilisearch, Settings } from "meilisearch";
import "./env.helper";

/*
  apiKey hanya dikirim bila benar-benar terisi. Klien 0.60 mengirim header
  Authorization untuk nilai kosong sekalipun, dan server tanpa master key
  menjawab 401 pada header yang tidak dikenalnya — pengembangan lokal
  tanpa kunci jadi tidak bisa memakai apa pun.
*/
const kunciMeili = process.env.MEILISEARCH_MASTER_KEY;

export const meili = new Meilisearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  ...(kunciMeili ? { apiKey: kunciMeili } : {}),
});

/*
  Setelan tiap indeks. Disimpan sebagai data, bukan ditulis dua kali di dalam
  cabang pembuatan, supaya penerapannya tidak bergantung pada BAGAIMANA
  indeksnya lahir.
*/
const SETELAN_INDEKS: Record<"product" | "package", Settings> = {
  product: {
    filterableAttributes: [
      "product_brand_id",
      "product_type_id",
      "is_active",
      "is_delete",
    ],
    sortableAttributes: ["created_at", "reference", "description"],
  },
  package: {
    filterableAttributes: ["is_delete"],
    sortableAttributes: ["name", "description"],
  },
};

/*
  Kode galat klien 0.60 tidak lagi tergeletak di `error.code`; ia berpindah
  ke `error.cause`. Pemeriksaan yang hanya melihat satu tempat menganggap
  "index tidak ada" sebagai galat tak dikenal, lalu melemparnya — sehingga
  indeksnya TIDAK PERNAH dibuat di server yang belum punya. Di mesin
  pengembangan kekeliruan ini tak terlihat karena indeksnya sudah lama ada.
*/
const kodeGalat = (error: any): string | undefined =>
  error?.cause?.code ?? error?.code;

/**
 * Memastikan satu indeks ada DAN setelannya terpasang.
 *
 * Setelan diterapkan setiap kali dijalankan, bukan hanya ketika indeksnya
 * baru dibuat. Bentuk lama memasangnya di dalam cabang "belum ada", dan itu
 * meninggalkan lubang yang benar-benar terjadi di server: `addDocuments`
 * membuat indeks sendiri bila belum ada — tanpa setelan apa pun — sehingga
 * pemeriksaan berikutnya menjawab "sudah ada" dan melewati pemasangannya
 * selamanya. Akibatnya pencarian berjalan, tetapi setiap penyaringan gagal:
 * "Attribute `is_delete` is not filterable", dan halaman Barang serta Stok
 * menjawab 500 padahal indeksnya penuh berisi dokumen.
 *
 * updateSettings bersifat idempoten, jadi memanggilnya berulang tidak
 * merugikan.
 */
const siapkanIndeks = async (uid: "product" | "package") => {
  try {
    await meili.getIndex(uid);
  } catch (error: any) {
    if (kodeGalat(error) !== "index_not_found") {
      console.error(`[error]: Gagal memeriksa indeks ${uid}: ${error}`);
      throw error;
    }
    console.info(`Indeks ${uid} belum ada — membuatnya...`);
    const dibuat = await meili.createIndex(uid, { primaryKey: "id" });
    await meili.tasks.waitForTask(dibuat.taskUid);
  }

  const tugas = await meili.index(uid).updateSettings(SETELAN_INDEKS[uid]);
  await meili.tasks.waitForTask(tugas.taskUid);
  console.info(`Indeks ${uid} siap; penyaring dan pengurutnya terpasang.`);
};

export const initializeMeiliSearch = async () => {
  if (!process.env.MEILISEARCH_MASTER_KEY) {
    console.warn(
      "MEILISEARCH_MASTER_KEY is not set. MeiliSearch operations requiring an API key might fail."
    );
  }
  console.info("Starting MeiliSearch setup...");
  await siapkanIndeks("product");
  await siapkanIndeks("package");
};

/*
  Kegagalannya DITANGKAP, bukan dibiarkan mengambang: modul ini ikut termuat
  oleh perintah satu-kali di startup.ts, dan penolakan tak tertangani dari
  Meilisearch yang mati mematikan seluruh proses sebelum perintahnya sempat
  berjalan — seeder gagal hanya karena mesin pencari tidak menyala. Server
  tetap mencatat kegagalannya; fitur pencarian sajalah yang lumpuh.
*/
export const meiliSiap = initializeMeiliSearch().catch((error) => {
  console.error(
    `[error]: Meilisearch tidak dapat diinisialisasi — fitur pencarian tidak akan berfungsi. ${error}`
  );
});
