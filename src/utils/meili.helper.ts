import { Meilisearch } from "meilisearch";
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

const INDEX_UID = "product"; // Change this to your desired index UID

/*
  Kode galat klien 0.60 tidak lagi tergeletak di `error.code`; ia berpindah
  ke `error.cause`. Pemeriksaan yang hanya melihat satu tempat menganggap
  "index tidak ada" sebagai galat tak dikenal, lalu melemparnya — sehingga
  indeksnya TIDAK PERNAH dibuat di server yang belum punya. Di mesin
  pengembangan kekeliruan ini tak terlihat karena indeksnya sudah lama ada.
*/
const kodeGalat = (error: any): string | undefined =>
  error?.cause?.code ?? error?.code;

export const initializeMeiliSearch = async () => {
  if (!process.env.MEILISEARCH_MASTER_KEY) {
    console.warn(
      "MEILISEARCH_MASTER_KEY is not set. MeiliSearch operations requiring an API key might fail."
    );
    // Depending on your app's needs, you might want to throw an error here
    // if the API key is absolutely essential for startup.
  }
  console.info("Starting MeiliSearch setup...");
  try {
    const product = await meili.getIndex("product");
    console.info("Product database already exists.");
  } catch (error: any) {
    if (kodeGalat(error) === "index_not_found") {
      console.info("Product index does not exist, creating it...");

      const createProduct = await meili.createIndex("product", {
        primaryKey: "id",
      });

      await meili.tasks.waitForTask(createProduct.taskUid);
      const productSettingTask = await meili.index("product").updateSettings({
        filterableAttributes: [
          "product_brand_id",
          "product_type_id",
          "is_active",
          "is_delete",
        ],
        sortableAttributes: ["created_at", "reference", "description"],
      });
      await meili.tasks.waitForTask(productSettingTask.taskUid);
      console.info("Product database initialized");
    } else {
      console.error(`[error]: Error initializing product index: ${error}`);
      throw error;
    }
  }

  try {
    const productPackage = await meili.getIndex("package");
    console.info("Package database already exists.");
  } catch (error: any) {
    if (kodeGalat(error) === "index_not_found") {
      console.info("Package index does not exist, creating it...");

      const createProductPackage = await meili.createIndex("package", {
        primaryKey: "id",
      });

      await meili.tasks.waitForTask(createProductPackage.taskUid);
      const productPackageSettingTask = await meili
        .index("package")
        .updateSettings({
          filterableAttributes: ["is_delete"],
          sortableAttributes: ["name", "description"],
        });
      await meili.tasks.waitForTask(productPackageSettingTask.taskUid);
      console.info("Package database initialized");
    } else {
      console.error(`[error]: Error initializing package index: ${error}`);
      throw error;
    }
  }
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
