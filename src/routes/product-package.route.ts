import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ProductPackageController from "../controllers/product-package.controller";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { administratorMiddleware } from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import {
  createPackageSchema,
  paramPackageSchema,
  updatePackagePriceSchema,
  updatePackageSchema,
} from "../schemas/product-package.schema";

const router = Router();

const productPackageController = new ProductPackageController(
  new ProductPackageRepository(prisma)
);

router.post(
  "/",
  validate(createPackageSchema),
  productPackageController.create
);

router.put("/", validate(updatePackageSchema), productPackageController.update);

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
  validate(updatePackagePriceSchema),
  productPackageController.updateSalesPrice
);

router.get(
  "/:id",
  validate(paramPackageSchema, "params"),
  productPackageController.fetchByID
);

router.delete(
  "/:id",
  validate(paramPackageSchema, "params"),
  productPackageController.delete
);

router.get("/", productPackageController.fetch);

export default router;
