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

    //     if (!product) {
    //       throw new Error("Product not found");
    //     }

    //   if (!product) {
    //     throw new Error("Product not found");
    //   }

    //   product.currentStock += stockOutData.quantity;
    //   await product.save();

    //         if (stockIn) {
    //           const stockInResidue = stockIn.residue;
    //           if (stockInResidue > quantity) {
    //             stockIn.residue = stockInResidue - quantity;
    //             await stockIn.save();

    //   if (!deleteStockOutProduct) {
    //     throw new Error("Product not found");
    //   }

    //   deleteStockOutProduct.currentStock -= deleteStockOutData.quantity;
    //   await deleteStockOutProduct.save();

    //     await mongoStockOutModel.findByIdAndDelete(stockOut._id);
    //   }

    //   // Added logger to check job.data
    //   console.log(job.data);

    //   if (!deleteStockInProduct) {
    //     throw new Error("Product not found");
    //   }

    //   deleteStockInProduct.currentStock -= job.data.quantity;
    //   await deleteStockInProduct.save();

    //   for (let i = 0; i < stockIn.length; i++) {
    //     const stockInItem = stockIn[i];
    //     stockInItem.price = updateStockInData.price;
    //     await stockInItem.save();
    //   }

    //   if (!salesReturnProduct) {
    //     throw new Error("Product not found");
    //   }

    //   salesReturnProduct.currentStock += stockReturnData.quantity;
    //   await salesReturnProduct.save();
    //   await queue.add("rearrange-stock-card", stockReturnData.itemID);

    //   let salesReturnQuantity = stockReturnData.quantity;
    //   while (salesReturnQuantity > 0) {
    //     if (salesReturnQuantity == 0) {
    //       break;
    //     }

    //       if (!stockOut) {
    //         throw new Error("Stock out not found");
    //       }

    //       if (stockOut.quantity > salesReturnQuantity) {
    //         stockOut.quantity -= salesReturnQuantity;
    //         await stockOut.save();
    //         salesReturnQuantity = 0;

    //     if (!deleteStockReturnProduct) {
    //       throw new Error("Product not found");
    //     }

    //       if (stockIn) {
    //         const stockInResidue = stockIn.residue;
    //         if (stockInResidue > quantity) {
    //           stockIn.residue = stockInResidue - quantity;
    //           await stockIn.save();

    //         quantity = 0;
    //         break;
    //       }
    //     }
    //   }
    //   break;
    // case "insert-product":
    //   const insertProductRreference = job.data.reference;
    //   const insertProductDescription = job.data.description;
    //   const insertProductID = job.data.id;
    //   const insertProductUnit = job.data.unit;
    //   const insertProductBrand = job.data.itemBrand;
    //   const insertProductType = job.data.itemType;
    //   const insertProductItemTypeID = job.data.itemTypeID;
    //   const insertProductItemBrandID = job.data.itemBrandID;
    //   const insertProductMinimumStock = job.data.minimumStock;

    //   break;
    // case "update-product-type":
    //   let updateProductTypeName = job.data.name;
    //   let updateProductTypeItemID = job.data.item as {
    //     id: number;
    //   }[];

    //   // Update product current stock
    //   for (let i = 0; i < deleteGoodReceiptItems.length; i++) {
    //     const quantity = deleteGoodReceiptItems[i].quantity;
    //     const itemID = deleteGoodReceiptItems[i].item_id;

    //     if (!product) {
    //       throw new Error("Product not found");
    //     }

    //   if (overflow.length == 0) {
    //     // Nothing to do here
    //     return;
    //   } else {
    //     for (let i = 0; i < overflow.length; i++) {
    //       const overflowItem = overflow[i];
    //       let overflowQuantity = overflowItem.quantity;
    //       while (overflowQuantity > 0) {
    //         if (overflowQuantity == 0) {
    //           break;
    //         }

    //         if (!stockIn) {
    //           // Save the overflow residue
    //           overflowItem.quantity = overflowQuantity;
    //           await overflowItem.save();
    //           break;
    //         } else {
    //           if (stockIn.residue >= overflowItem.quantity) {
    //             stockIn.residue = stockIn.residue - overflowItem.quantity;
    //             await stockIn.save();

    //       if (!stockIn) {
    //         // No quantity left in stock in
    //         break;
    //       } else {
    //         if (stockIn.residue > overflowItem.quantity) {
    //           stockIn.residue = stockIn.residue - overflowItem.quantity;
    //           await stockIn.save();
  }
};

// connectToDatabase().then(() => {
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
// });
