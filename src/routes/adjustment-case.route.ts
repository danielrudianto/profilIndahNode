import { Router } from "express";
import AdjustmentCaseController from "../controllers/adjustment-case.controller";
import { superadministratorMiddleware } from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import {
  archiveAdjustmentCaseSchema,
  bodyIdAdjustmentCaseSchema,
  createAdjustmentCaseSchema,
  paramAdjustmentCaseSchema,
} from "../schemas/adjustment-case.schema";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { prisma } from "../utils/database.helper";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

const router = Router();

const adjustmentCaseController = new AdjustmentCaseController(
  new AdjustmentCaseRepository(prisma),
  new ProductStockRepository(prisma),
  new StockInRepository(prisma),
  new StockOutRepository(prisma),
  new StockCardRepository(prisma)
);

/*
  Rute ini dulu memasang ErrorHelper.intercept tanpa satu pun validator di
  depannya, sehingga tidak pernah ada galat untuk ditangkap. Middleware kosong
  itu dilepas; perilakunya tidak berubah.
*/
router.get("/archives", adjustmentCaseController.fetchAnnualArchives);

router.post(
  "/archives",
  validate(archiveAdjustmentCaseSchema),
  adjustmentCaseController.fetchArchives
);

/*
  superadministratorMiddleware tetap berjalan sebelum validasi, persis seperti
  rantai lama: permintaan tanpa wewenang ditolak lebih dulu, sehingga bentuk
  badan permintaan tidak pernah bocor ke pemanggil yang tidak berhak.
*/
router.post(
  "/approve",
  superadministratorMiddleware,
  validate(bodyIdAdjustmentCaseSchema),
  adjustmentCaseController.approve
);
router.post(
  "/reject",
  superadministratorMiddleware,
  validate(bodyIdAdjustmentCaseSchema),
  adjustmentCaseController.reject
);

router.get("/unconfirmed", adjustmentCaseController.fetchUnconfirmed);
router.get(
  "/:id",
  validate(paramAdjustmentCaseSchema, "params"),
  adjustmentCaseController.fetchByID
);

router.post(
  "/",
  validate(createAdjustmentCaseSchema),
  adjustmentCaseController.create
);

/*
  Penghapusan disamakan dengan approve dan reject: hanya superadministrator.

  Sebelumnya route ini hanya berlindung pada authMiddleware di app.ts, sehingga
  SETIAP pengguna yang login — termasuk sales dan gudang — dapat menghapus
  penyesuaian stok milik siapa pun. Penyesuaian stok mengubah jumlah barang
  tanpa dokumen jual-beli, jadi kemampuan menghapusnya setara dengan kemampuan
  menyetujuinya, dan keduanya memang dipegang pemilik.

  Menyembunyikan tombolnya di frontend tidak menutup apa pun: endpoint-nya tetap
  bisa dipanggil langsung.
*/
router.delete(
  "/:id",
  superadministratorMiddleware,
  validate(paramAdjustmentCaseSchema, "params"),
  adjustmentCaseController.delete
);

export default router;
