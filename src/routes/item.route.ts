import { Router } from "express";
import { query } from "express-validator";
import ItemController from "../controller/item.controller";

const router = Router();

router.post("/stock/download", ItemController.downloadStock);
router.post("/units", ItemController.updateUnit);
router.post("/", ItemController.create);

router.put("/unit", ItemController.updateUnit);
router.put("/", ItemController.update);

router.get("/setActive/:reference", ItemController.toggleActive);
router.get(
  "/dailyStock/:reference",
  query("start").not().isEmpty().withMessage("Mohon isikan tanggal"),
  query("end").not().isEmpty().withMessage("Mohon isikan tanggal"),
  ItemController.fetchDailyStock
);
router.get("/insufficient", ItemController.fetchInsufficient);
router.get(
  "/stock",
  query("reference")
    .not()
    .isEmpty()
    .withMessage("Referensi barang wajib diisikan."),
  ItemController.fetchStock
);
router.get("/units/:reference", ItemController.fetchUnits);
router.get("/search", ItemController.fetchSearchResult);
router.get("/:reference", ItemController.fetchByReference);
router.get("/", ItemController.fetch);

router.delete("/:itemReference", ItemController.delete);

export default router;
