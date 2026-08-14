import { Router } from "express";
import ProductController from "../../controllers/product.controller";
import { administratorMiddleware } from "../../utils/auth.helper";
import { ProductRepository } from "../../repositories/product.repository";
import { prisma } from "../../utils/database.helper";
import { ProductUnitRepository } from "../../repositories/product-unit.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { validate } from "../../utils/validate.helper";
import {
  aktifkanProdukSchema,
  ambilProdukSchema,
  buatProdukSchema,
  hapusProdukSchema,
  ubahHargaSchema,
  ubahProdukSchema,
} from "../../schemas/produk-pengeluaran.schema";

const router = Router();

const productController = new ProductController(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma),
  new StockCardRepository(prisma)
);

router.post("/", validate(buatProdukSchema), productController.create);

router.get("/autocomplete", productController.fetchAutocomplete);
router.get("/selector", productController.fetchSelector);
router.get(
  "/:id",
  validate(ambilProdukSchema, "params"),
  productController.fetchByID
);

router.get("/", productController.fetch);
router.put(
  "/active",
  validate(aktifkanProdukSchema),
  productController.toggleActive
);
router.put("/", validate(ubahProdukSchema), productController.update);

router.put(
  "/price-purchase",
  validate(ubahHargaSchema),
  productController.updatePurchasePrice
);

router.put(
  "/price-sales",
  validate(ubahHargaSchema),
  productController.updateSalesPrice
);

// Tanda minus di depan router.delete pada versi sebelumnya adalah salah
// ketik. Secara sintaks sah — minus unary diterapkan pada nilai kembalian
// lalu dibuang — sehingga rutenya tetap terdaftar dan tidak ada galat.
router.delete(
  "/:id",
  administratorMiddleware,
  validate(hapusProdukSchema, "params"),
  productController.delete
);

export default router;
