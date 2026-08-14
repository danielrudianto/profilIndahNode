import { Router } from "express";
import { ProductPurchasePriceController } from "../controllers/product-price-purchase.controller";
import { prisma } from "../utils/database.helper";
import { ProductRepository } from "../repositories/product.repository";
import { validate } from "../utils/validate.helper";
import { ubahHargaSatuanSchema } from "../schemas/produk-pengeluaran.schema";

const router = Router();

const productPurchasePriceController = new ProductPurchasePriceController(
  new ProductRepository(prisma)
);

router.get("/", productPurchasePriceController.fetch);

/*
  Aturan validasinya pindah ke ubahHargaSatuanSchema. Rantai lama di sini
  identik dengan yang ada di product-price-sales.route.ts, jadi keduanya kini
  memakai skema yang sama; alasan dan seluk-beluk urutannya ditulis di berkas
  skema.
*/
router.put(
  "/",
  validate(ubahHargaSatuanSchema),
  productPurchasePriceController.updateByProductID
);

/*
  GET /v2/:id, POST /format, POST /bulk, POST /, dan PUT /v2 tidak pernah
  aktif — barisnya sudah dikomentari sejak sebelum migrasi ini dan ikut
  dibersihkan bersama rantai validatornya.
*/

export default router;
