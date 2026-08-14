import { Router } from "express";
import GoodReceiptController from "../controllers/good-receipt.controller";
import {
  putriForbiddenMiddleware,
  superadministratorMiddleware,
} from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { prisma } from "../utils/database.helper";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import {
  archiveGoodReceiptSchema,
  checkGoodReceiptSchema,
  confirmGoodReceiptSchema,
  createGoodReceiptSchema,
  deleteGoodReceiptSchema,
  paramGoodReceiptSchema,
  rejectGoodReceiptSchema,
  updateGoodReceiptSchema,
} from "../schemas/good-receipt.schema";

const router = Router();

const goodReceiptController = new GoodReceiptController(
  new GoodReceiptRepository(prisma),
  new StockInRepository(prisma),
  new ProductStockRepository(prisma),
  new StockCardRepository(prisma)
);

router.get("/archives", goodReceiptController.fetchAnnualArchives);

router.post(
  "/archives",
  validate(archiveGoodReceiptSchema),
  goodReceiptController.fetchArchives
);

router.post(
  "/check",
  validate(checkGoodReceiptSchema),
  goodReceiptController.check
);

router.post(
  "/",
  putriForbiddenMiddleware,
  validate(createGoodReceiptSchema),
  goodReceiptController.create
);

/*
  CACAT KODE LAMA YANG SENGAJA DIPERTAHANKAN: rute POST "/" berikut tidak
  pernah berjalan. Express memilih rute pertama yang cocok, dan
  putriForbiddenMiddleware di atas memanggil next() biasa — bukan
  next("route") — sehingga rantai POST "/" yang pertama selalu berakhir di
  goodReceiptController.create. Definisi kedua ini duplikat dari PUT "/" di
  bawah, sampai ke pesan galatnya. Dibiarkan apa adanya karena menghapus rute
  adalah perubahan permukaan API, bukan bagian dari migrasi validasi.
*/
router.post(
  "/",
  superadministratorMiddleware,
  validate(updateGoodReceiptSchema),
  goodReceiptController.update
);

router.get("/unconfirmed", goodReceiptController.fetchUnconfirmed);

router.get(
  "/:id",
  validate(paramGoodReceiptSchema, "params"),
  goodReceiptController.fetchByID
);

router.put(
  "/confirm",
  validate(confirmGoodReceiptSchema),
  goodReceiptController.confirm
);

router.put(
  "/reject",
  validate(rejectGoodReceiptSchema),
  goodReceiptController.reject
);

router.put(
  "/",
  superadministratorMiddleware,
  validate(updateGoodReceiptSchema),
  goodReceiptController.update
);

router.delete(
  "/:id",
  superadministratorMiddleware,
  validate(deleteGoodReceiptSchema, "params"),
  goodReceiptController.delete
);

export default router;
