import { prisma } from "../utils/database.helper";
import { meili, meiliSiap } from "../utils/meili.helper";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductPackageService } from "../services/package.service";
import { ProductService } from "../services/product.service";

const productService = new ProductService(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma)
);

const packageService = new ProductPackageService(
  new ProductPackageRepository(prisma)
);

/*
  Menunggu satu tugas Meilisearch sampai benar-benar selesai.

  Ditulis dengan polling sendiri, bukan waitForTask bawaan klien: nama
  pilihan tenggat waktunya berbeda antar versi (timeOutMs pada klien lama,
  timeout pada yang baru), dan salah nama membuatnya diam-diam memakai
  tenggat bawaan lima detik — terlalu pendek untuk ribuan dokumen, sehingga
  penyiapan tampak gagal padahal indeksnya baik-baik saja.
*/
const tungguTugas = async (taskUid: number, keterangan: string) => {
  for (let detik = 0; detik < 600; detik++) {
    const tugas = await meili.tasks.getTask(taskUid);
    if (tugas.status === "succeeded") {
      return;
    }
    if (tugas.status === "failed" || tugas.status === "canceled") {
      throw new Error(`${keterangan} gagal: ${JSON.stringify(tugas.error)}`);
    }
    await new Promise((lanjut) => setTimeout(lanjut, 1000));
  }
  throw new Error(`${keterangan} belum selesai setelah sepuluh menit`);
};

export const main = async () => {
  /*
    Inisialisasi indeks berjalan saat modul dimuat, TANPA ditunggu siapa pun.
    Pada server yang indeksnya belum ada, baris di bawah bisa mendahuluinya
    dan gagal dengan "Index `product` not found" — bukan karena indeksnya
    tidak akan dibuat, melainkan karena ia belum sempat.
  */
  await meiliSiap;

  console.info("Mengosongkan indeks barang...");
  const hapusBarang = await meili.index("product").deleteAllDocuments();
  await tungguTugas(hapusBarang.taskUid, "Pengosongan indeks barang");

  const products = await productService.fetchAll();
  console.info(`Mengirim ${products.length} barang ke indeks...`);
  const isiBarang = await meili
    .index("product")
    .addDocuments(products, { primaryKey: "id" });
  await tungguTugas(isiBarang.taskUid, "Pengisian indeks barang");

  console.info("Mengosongkan indeks paket...");
  const hapusPaket = await meili.index("package").deleteAllDocuments();
  await tungguTugas(hapusPaket.taskUid, "Pengosongan indeks paket");

  const packages = await packageService.fetchAll();
  console.info(`Mengirim ${packages.length} paket ke indeks...`);
  const isiPaket = await meili
    .index("package")
    .addDocuments(packages, { primaryKey: "id" });
  await tungguTugas(isiPaket.taskUid, "Pengisian indeks paket");

  console.info("Selesai — indeks pencarian siap dipakai.");
};

/*
  Prosesnya ditutup sendiri. Tanpa ini ia menggantung setelah pekerjaannya
  selesai — koneksi Prisma dan Redis masih terbuka — dan perintah berikutnya
  yang ditempel dalam satu baris tidak pernah mendapat giliran, seolah-olah
  skrip ini macet padahal sudah rampung.
*/
main()
  .catch((galat) => {
    console.error(`[error]: Penyiapan indeks gagal: ${galat}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit();
  });
