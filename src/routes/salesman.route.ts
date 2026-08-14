import { Router } from "express";
import { SalesmanController } from "../controllers/sales.controller";
import { redisClient } from "../utils/redis.helper";
import { validate } from "../utils/validate.helper";
import {
  buatSalesmanSchema,
  hapusSalesmanSchema,
} from "../schemas/salesman.schema";

const router = Router();

const salesmanController = new SalesmanController(redisClient);

router.post(
  "/",
  validate(buatSalesmanSchema),
  salesmanController.createSalesman
);
router.post(
  "/delete",
  validate(hapusSalesmanSchema),
  salesmanController.deleteSalesman
);

/*
  Kedua rute GET tidak divalidasi, sama seperti sebelumnya. `keyword` dilewatkan
  ke translateKeyword yang sudah menangani nilai kosong maupun bukan teks, dan
  memasang skema di sini berarti menolak permintaan yang selama ini dilayani —
  keputusan terpisah yang tidak ikut dalam migrasi ini.
*/
router.get("/", salesmanController.fetch);
router.get("/all", salesmanController.fetchAll);

export default router;
