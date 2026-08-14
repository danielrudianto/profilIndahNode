import { Router } from "express";
import { ProductSalesPriceController } from "../controllers/product-price-sales.controller";
import { prisma } from "../utils/database.helper";
import { ProductRepository } from "../repositories/product.repository";
import { validate } from "../utils/validate.helper";
import {
  getSalesPriceSchema,
  updateUnitPriceSchema,
} from "../schemas/product-price.schema";

const router = Router();

const productSalesPriceController = new ProductSalesPriceController(
  new ProductRepository(prisma)
);

router.get(
  "/:id",
  validate(getSalesPriceSchema, "params"),
  productSalesPriceController.fetchByID
);

router.get("/", productSalesPriceController.fetch);

/*
  Rantai lama pada endpoint ini identik baris demi baris dengan yang ada di
  product-price-purchase.route.ts, jadi keduanya memakai updateUnitPriceSchema
  yang sama. Seluk-beluk urutan pesannya ditulis di berkas skema.
*/
router.put(
  "/",
  validate(updateUnitPriceSchema),
  productSalesPriceController.update
);

/*
  POST /format, POST /bulk, PUT /v2, dan PUT / dihapus. Keempat handler-nya
  hanya berisi kode yang dikomentari, jadi tidak pernah mengirim balasan dan
  permintaan menggantung sampai timeout.
*/

export default router;
