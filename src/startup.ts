/* Pemuat lingkungan harus dijalankan sebelum modul mana pun membaca env. */
import "./utils/env.helper";

import { redisClient } from "./utils/redis.helper";
import { MinimumStockService } from "./services/minimum-stock.service";
import { prisma } from "./utils/database.helper";
import { EXPENSE_TYPE_SEED } from "./constants/expense-type-seed.constant";
import { meili } from "./utils/meili.helper";
import { ProductService } from "./services/product.service";
import { ProductRepository } from "./repositories/product.repository";
import { ProductUnitRepository } from "./repositories/product-unit.repository";
import { ProductPackageService } from "./services/package.service";
import { ProductPackageRepository } from "./repositories/product-package.repository";
import { StockInService } from "./services/stock-in.service";
import { StockInRepository } from "./repositories/stock-in.repository";
import { GoodReceiptRepository } from "./repositories/good-receipt.repository";
import { StockOutService } from "./services/stock-out.service";
import { StockOutRepository } from "./repositories/stock-out.repository";
import { StockCardService } from "./services/stock-card.service";
import { StockCardRepository } from "./repositories/stock-card.repository";
import { SalesInvoiceService } from "./services/sales-invoice.service";
import { SalesInvoiceRepository } from "./repositories/sales-invoice.repository";
import { ProductStockRepository } from "./repositories/product-stock.repository";
import { ProductStockService } from "./services/product.stock.service";
import { AdjustmentCaseRepository } from "./repositories/adjustment-case.repository";
import { SalesReturnRepository } from "./repositories/sales-return.repository";

async function connect() {
  await prisma.$connect();
  console.info("[info]: Connected with database using Prisma");

  await redisClient.connect();
  console.info("[info]: Connected with redis");
}

async function setupDatabase() {
  try {
    await meili.getIndex("product");
    console.info("[info]: Product index already exists, skipping creation");
  } catch (error: any) {
    if (error.code === "index_not_found") {
      console.info("[info]: Product index not found, creating index...");
      const createProduct = await meili.createIndex("product", {
        primaryKey: "id",
      });

      console.info("[info]: Product index created successfully");

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
    }
  }

  try {
    await meili.getIndex("package");
    console.info("[info]: Package index already exists, skipping creation");
  } catch (error: any) {
    if (error.code === "index_not_found") {
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
    }
  }
}

async function syncProduct() {
  const productService = new ProductService(
    new ProductRepository(prisma),
    new ProductUnitRepository(prisma)
  );

  await meili.index("product").deleteAllDocuments();

  const products = await productService.fetchAll();
  console.info(`[info]: Fetched ${products.length} products from database`);

  // add all products to meili
  const chunkSize = 1000; // Define your chunk size
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const productInsertTask = await meili
      .index("product")
      .addDocuments(chunk, { primaryKey: "id" });
    await meili.tasks.waitForTask(productInsertTask.taskUid);
    console.info(`[info]: Inserted chunk ${Math.floor(i / chunkSize) + 1}`);
  }

  console.info(`[info]: Product database successfully inserted`);
}

async function syncProductPackage() {
  const packageService = new ProductPackageService(
    new ProductPackageRepository(prisma)
  );

  await meili.index("package").deleteAllDocuments();

  const productPackages = await packageService.fetchAll();
  console.info(
    `[info]: Fetched ${productPackages.length} product packages from database`
  );

  const productPackageInsertTask = await meili
    .index("package")
    .addDocuments([productPackages], { primaryKey: "id" });
  await meili.tasks.waitForTask(productPackageInsertTask.taskUid);
  console.info(`[info]: Product package database successfully inserted`);
}

async function syncSales() {
  const salesInvoiceService = new SalesInvoiceService(
    new SalesInvoiceRepository(prisma),
    new ProductStockRepository(prisma),
    new StockCardRepository(prisma),
    new StockOutRepository(prisma)
  );

  await salesInvoiceService.syncSales();

  console.info(`[info]: Sales successfully synced`);
}

async function updateProductStock() {
  console.info(`Commencing product stock update`);
  const productStockService = new ProductStockService(
    new ProductStockRepository(prisma),
    new GoodReceiptRepository(prisma),
    new AdjustmentCaseRepository(prisma),
    new SalesInvoiceRepository(prisma),
    new SalesReturnRepository(prisma),
    new ProductRepository(prisma)
  );
  console.info(`Product stock service initialized`);

  await productStockService.updateProductStock();
}

async function insertStockInOut() {
  const stockInService = new StockInService(new StockInRepository(prisma));
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );

  // stock_out menunjuk stock_in lewat FK stock_in_id, jadi yang menunjuk
  // harus pergi lebih dulu. Urutan lama (stock_in duluan) langsung P2003
  // begitu dijalankan pada basis data yang FK-nya ditegakkan migrasi.
  console.info(`[info]: Start clearing stock out data`);
  await stockOutService.delete();

  console.info(`[info]: Start inserting stock in data`);

  await stockInService.delete();
  await stockInService.insertFromDocuments();

  console.info(`[info]: Stock in successfully inserted`);

  console.info(`[info]: Start inserting stock out data`);

  await stockOutService.insertFromDocuments();

  console.info(`[info]: Stock out successfully inserted`);
}

async function insertStockOut() {
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );
  console.info(`[info]: Start inserting stock out data`);

  await stockOutService.delete();
  await stockOutService.insertFromDocuments();

  console.info(`[info]: Stock out successfully inserted`);
}

async function calculateStockOut() {
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );
  try {
    await stockOutService.calculateStockOut();
  } catch (error) {
    console.error(`[error]: Error on calculating HPP ${error}`);
  }
}

/**
 * Jalur borongan — untuk pembangunan ulang historis yang antreannya
 * ratusan ribu baris; aturan penetapannya sama persis dengan
 * calculateStockOut.
 */
async function calculateStockOutBulk() {
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );
  try {
    await stockOutService.calculateStockOutBulk();
  } catch (error) {
    console.error(`[error]: Error on calculating HPP (bulk) ${error}`);
  }
}

/**
 * Bangun ulang seluruh lapisan stok dari dokumen, lalu tetapkan ulang
 * HPP borongan — dipakai SETELAH aturan harga lapisan berubah (mis.
 * HPP #4: alokasi diskon faktur), supaya sejarah mengikuti definisi
 * yang sama dengan jalur hidup.
 *
 * PERINGATAN: selama proses, stock_in dan stock_out dikosongkan lalu
 * disusun ulang — jalankan saat aplikasi tidak melayani traffic.
 * Angka sebelum/sesudah dicetak supaya dampaknya terlihat; selisih
 * nilai masuknya kira-kira total diskon faktur yang baru teralokasi.
 */
async function rebuildStockIn() {
  const nilaiMasuk = async () => {
    const baris = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS lapisan, COALESCE(SUM(price * quantity), 0) AS nilai
      FROM stock_in`;
    return {
      lapisan: Number(baris[0].lapisan),
      nilai: Number(baris[0].nilai),
    };
  };

  const sebelum = await nilaiMasuk();
  console.info(
    `[info]: Sebelum — ${sebelum.lapisan} lapisan, total nilai masuk Rp ${Math.round(sebelum.nilai).toLocaleString("id-ID")}`
  );

  await insertStockInOut();
  await calculateStockOutBulk();

  const sesudah = await nilaiMasuk();
  console.info(
    `[info]: Sesudah — ${sesudah.lapisan} lapisan, total nilai masuk Rp ${Math.round(sesudah.nilai).toLocaleString("id-ID")}`
  );
  console.info(
    `[info]: Selisih nilai masuk Rp ${Math.round(sebelum.nilai - sesudah.nilai).toLocaleString("id-ID")} — kira-kira total diskon faktur yang teralokasi`
  );
}

/**
 * Penyapu piutang receh: menandai lunas dokumen yang sisanya <=
 * toleransi pembulatan (Rp 5). Idempoten, aman dijalankan kapan pun.
 */
async function calculateMinimumStock() {
  const layanan = new MinimumStockService(prisma);
  await layanan.calculate();
}

async function settleRoundedReceivables() {
  const {
    ReceivableRepository,
  } = require("./repositories/receivable.repository");
  const { redisClient } = require("./utils/redis.helper");
  const repo = new ReceivableRepository(redisClient, prisma);
  const jumlah = await repo.settleWithinTolerance();
  console.info(`[info]: ${jumlah} dokumen receh ditandai lunas`);
}

async function insertStockCard() {
  const stockCardService = new StockCardService(
    new StockCardRepository(prisma)
  );
  await stockCardService.startup();
}

async function orderStockCard() {
  const stockCardService = new StockCardService(
    new StockCardRepository(prisma)
  );
  await stockCardService.reorder();
}

/**
 * Menanam daftar baku tipe pengeluaran (lihat constants/expense-type-seed).
 *
 * Idempoten: mencocokkan berdasarkan nama. Tipe yang sudah ada dibiarkan —
 * termasuk yang pernah dihapus-lunak, supaya menjalankan seeder dua kali
 * tidak menghidupkan kembali keputusan yang sudah diambil. created_by memakai
 * pengguna tertua di basis data; seeder menolak berjalan pada basis data
 * tanpa pengguna sama sekali.
 */
async function seedExpenseType() {
  const pengguna = await prisma.user.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!pengguna) {
    console.error(
      "[error]: Tidak ada pengguna di basis data — jalankan pembuatan pengguna lebih dulu."
    );
    return;
  }

  const sudahAda = await prisma.expense_type.findMany({
    select: { name: true },
  });
  const namaAda = new Set(sudahAda.map((tipe) => tipe.name));

  let ditanam = 0;
  for (const tipe of EXPENSE_TYPE_SEED) {
    if (namaAda.has(tipe.name)) {
      continue;
    }

    await prisma.expense_type.create({
      data: {
        name: tipe.name,
        description: tipe.description,
        created_by: pengguna.id,
        created_at: new Date(),
      },
    });
    ditanam++;
  }

  console.info(
    `[info]: Seeder tipe pengeluaran selesai — ${ditanam} baru, ${namaAda.size} sudah ada.`
  );
}

async function createIndexes() {
  await meili.createIndex("product", {
    primaryKey: "id",
  });

  await meili.createIndex("package", {
    primaryKey: "id",
  });
}

async function runFunction(funcName: string) {
  await connect();
  switch (funcName) {
    case "setupDatabase":
      await setupDatabase();
      process.exit(0);
    case "syncProduct":
      await syncProduct();
      process.exit(0);
    case "syncProductPackage":
      await syncProductPackage();
      process.exit(0);
    case "updateProductStock":
      await updateProductStock();
      process.exit(0);
    case "insertStockInOut":
      await insertStockInOut();
      process.exit(0);
    case "insertStockOut":
      await insertStockOut();
      process.exit(0);
    case "calculateStockOut":
      await calculateStockOut();
      process.exit(0);
    case "calculateStockOutBulk":
      await calculateStockOutBulk();
      process.exit(0);
    case "rebuildStockIn":
      await rebuildStockIn();
      process.exit(0);
    case "calculateMinimumStock":
      await calculateMinimumStock();
      process.exit(0);
    case "settleRoundedReceivables":
      await settleRoundedReceivables();
      process.exit(0);
    case "insertStockCard":
      await insertStockCard();
      process.exit(0);
    case "orderStockCard":
      await orderStockCard();
      process.exit(0);
    case "syncSales":
      await syncSales();
      process.exit(0);
    case "seedExpenseType":
      await seedExpenseType();
      process.exit(0);
    default:
      console.error("[error]: Function not found");
      process.exit(0);
  }
}

const args = process.argv.slice(2);
if (args.length > 0) {
  runFunction(args[0]);
} else {
  console.error("[error]: No function specified");
}
