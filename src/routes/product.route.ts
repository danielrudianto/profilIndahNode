import { Router } from "express";
import ProductController from "../controllers/product.controller";
import { administratorMiddleware } from "../utils/auth.helper";
import { ProductRepository } from "../repositories/product.repository";
import { prisma } from "../utils/database.helper";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { validate } from "../utils/validate.helper";
import {
  activateProductSchema,
  createProductSchema,
  deleteProductSchema,
  getProductSchema,
  updateProductPriceSchema,
  updateProductSchema,
} from "../schemas/product.schema";

const router = Router();

const productController = new ProductController(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma),
  new StockCardRepository(prisma)
);

router.post("/", validate(createProductSchema), productController.create);

router.get("/autocomplete", productController.fetchAutocomplete);
router.get("/selector", productController.fetchSelector);
router.get(
  "/:id",
  validate(getProductSchema, "params"),
  productController.fetchByID
);

router.get("/", productController.fetch);
router.put(
  "/active",
  validate(activateProductSchema),
  productController.toggleActive
);
router.put("/", validate(updateProductSchema), productController.update);

/*
  Hanya administrator (peran 5) dan pemilik (peran 7) yang boleh MENIMPA harga
  di master barang.

  Sebelumnya rute ini hanya dijaga authMiddleware di titik pasangnya, sehingga
  setiap pengguna yang sudah masuk — termasuk staf pembelian dan sales — bisa
  menulis ulang harga seluruh barang lewat satu panggilan langsung. Menyembunyikan
  tombolnya di layar bukan penjagaan; yang menahan akses harus di sini.
*/
router.put(
  "/price-purchase",
  administratorMiddleware,
  validate(updateProductPriceSchema),
  productController.updatePurchasePrice
);

/*
  Hanya administrator (peran 5) dan pemilik (peran 7) yang boleh MENIMPA harga
  di master barang.

  Sebelumnya rute ini hanya dijaga authMiddleware di titik pasangnya, sehingga
  setiap pengguna yang sudah masuk — termasuk staf pembelian dan sales — bisa
  menulis ulang harga seluruh barang lewat satu panggilan langsung. Menyembunyikan
  tombolnya di layar bukan penjagaan; yang menahan akses harus di sini.
*/
router.put(
  "/price-sales",
  administratorMiddleware,
  validate(updateProductPriceSchema),
  productController.updateSalesPrice
);

// Tanda minus di depan router.delete pada versi sebelumnya adalah salah
// ketik. Secara sintaks sah — minus unary diterapkan pada nilai kembalian
// lalu dibuang — sehingga rutenya tetap terdaftar dan tidak ada galat.
router.delete(
  "/:id",
  administratorMiddleware,
  validate(deleteProductSchema, "params"),
  productController.delete
);

export default router;
