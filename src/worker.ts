import dotenv from "dotenv"; // If you load .env here for testing this file directly
dotenv.config(); // If you load .env here

import { Job, Worker } from "bullmq";
import { ProductService } from "./services/product.service";
import { ProductRepository } from "./repositories/product.repository";
import { ProductUnitRepository } from "./repositories/product-unit.repository";
import { prisma } from "./utils/database.helper";
import { ProductBrandRepository } from "./repositories/product-brand.repository";
import { ProductBrandService } from "./services/product-brand.service";
import { GoodReceiptService } from "./services/good-receipt.service";
import { GoodReceiptRepository } from "./repositories/good-receipt.repository";
import { StockInRepository } from "./repositories/stock-in.repository";
import { ProductPackageService } from "./services/package.service";
import { ProductPackageRepository } from "./repositories/product-package.repository";
import { StockCardService } from "./services/stock-card.service";
import { StockCardRepository } from "./repositories/stock-card.repository";
import { StockOutService } from "./services/stock-out.service";
import { StockOutRepository } from "./repositories/stock-out.repository";

const workerOptions = {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  concurrency: 1,
};

const productService = new ProductService(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma)
);

const productBrandService = new ProductBrandService(
  new ProductBrandRepository(prisma)
);

const goodReceiptService = new GoodReceiptService(
  new GoodReceiptRepository(prisma),
  new StockInRepository(prisma)
);

const productPackageService = new ProductPackageService(
  new ProductPackageRepository(prisma)
);

const stockCardService = new StockCardService(new StockCardRepository(prisma));

const stockOutService = new StockOutService(
  new StockOutRepository(prisma),
  new StockInRepository(prisma)
);

const workerHandler = async (job: Job<any>) => {
  const name = job.name;
  switch (name) {
    case "product-created":
      await productService.create(job.data.id);
      break;
    case "product-updated":
      await productService.update(job.data.id);
      break;
    case "product-deleted":
      await productService.delete(job.data.id);
      break;
    case "product-brand-updated":
      await productBrandService.update(job.data.id);
      break;
    case "good-receipt-created":
      await goodReceiptService.create(job.data.id);
      /*
        Stok yang baru masuk bisa jadi melayani penjualan yang sedang
        menunggak penetapan (terjual saat lapisan kosong) — sapu sekali
        supaya tunggakannya tidak menunggu dokumen berikutnya.
      */
      await stockOutService.calculateStockOut();
      break;
    /*
      Penetapan HPP OTOMATIS. Dulu perhitungan ini hanya hidup sebagai
      perintah CLI manual, sehingga angka HPP bulan berjalan bergantung pada
      disiplin operator menjalankannya. Kini setiap dokumen yang menulis
      stock_out mengantrekan job ini; concurrency worker = 1 menjamin dua
      sapuan tidak pernah berebut residue yang sama.
    */
    case "hpp-assign":
      await stockOutService.calculateStockOut();
      break;
    case "package-updated":
      await productPackageService.update(job.data.id);
      break;
    case "stock-card-inserted":
      await stockCardService.update(job.data.id);
      break;
    case "stock-card-deleted":
      await stockCardService.delete(job.data);
      break;
    case "good-receipt-deleted":
      await goodReceiptService.deleteByID(job.data);
      /*
        Lapisan yang dihapus melepas stock_out yang menempel padanya — sapu
        supaya mereka menempel ulang ke lapisan yang tersisa.
      */
      await stockOutService.calculateStockOut();
      // `break` ini sempat ikut terkubur di dalam bongkahan kode Mongoose yang
      // dikomentari di bawahnya. Selama bongkahan itu masih ada, ketiadaannya
      // tidak berefek — tidak ada case lain di belakangnya untuk dijatuhi.
      // Dipasang lagi supaya case berikutnya yang ditambahkan orang tidak
      // diam-diam ikut terpanggil.
      break;
  }
};

const worker = new Worker("queue", workerHandler, workerOptions);
worker.on("failed", (job, err) => {
  console.error(`[error]: ${job!.id} has failed with ${err.message}`);
});

worker.on("completed", (job, _) => {
  console.log(`[info]: Job #${job!.id} [${job!.name}] has completed.`);
});

worker.on("error", async (err) => {
  console.error(`[error]: ${err.message}`);
});

console.info("[info]: Worker started!");
