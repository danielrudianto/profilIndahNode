import { Router } from "express";
import PromotionController from "../controllers/promotion.controller";
import { prisma } from "../utils/database.helper";
import { ProductRepository } from "../repositories/product.repository";
import { PromotionRepository } from "../repositories/promotion.repository";
import { validate } from "../utils/validate.helper";
import {
  createPromotionSchema,
  paramPromotionResultSchema,
  paramPromotionSchema,
  updatePromotionSchema,
} from "../schemas/promotion.schema";

const router = Router();

const promotionController = new PromotionController(
  new PromotionRepository(prisma),
  new ProductRepository(prisma)
);

router.post("/", validate(createPromotionSchema), promotionController.create);

/*
  Sumber "params" harus disebut secara eksplisit: bawaan validate() adalah
  "body", dan skema parameter yang dijalankan terhadap badan permintaan akan
  meloloskan segalanya.
*/
router.get(
  "/result/sales/:id",
  validate(paramPromotionSchema, "params"),
  promotionController.downloadSalesResultByID
);

router.get(
  "/result/purchase/:id",
  validate(paramPromotionSchema, "params"),
  promotionController.downloadPurchaseResultByID
);

router.get(
  "/result/:id",
  validate(paramPromotionSchema, "params"),
  promotionController.fetchResult
);

router.get(
  "/:id",
  validate(paramPromotionSchema, "params"),
  promotionController.fetchByID
);

router.get("/", promotionController.fetch);

/*
  Jalur ini sudah didaftarkan di atas dengan validasi yang berbeda, sehingga
  pendaftaran kedua ini tidak pernah tercapai — Express memakai penangan
  pertama yang cocok. Dibiarkan apa adanya supaya migrasi ini hanya mengganti
  lapisan validasi; menghapus jalur ganda adalah perubahan tersendiri.
*/
router.get(
  "/result/:id",
  validate(paramPromotionResultSchema, "params"),
  promotionController.fetchResult
);

router.put("/", validate(updatePromotionSchema), promotionController.update);

export default router;
