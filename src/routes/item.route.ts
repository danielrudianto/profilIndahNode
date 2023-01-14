import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../assets/error_list";
import ItemController from "../controller/item.controller";
import { administratorMiddleware } from "../helper/auth.helper";

const router = Router();

router.post("/stock/download", ItemController.downloadStock);
router.post("/stockReport/pdf", ItemController.fetchStockReportPdf);
router.post("/stockReport", ItemController.fetchStockReport);
router.post(
  "/",
  body("reference").exists().withMessage(ErrorList["Parameter error"]),
  body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").exists().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("brand").exists().withMessage(ErrorList["Parameter error"]),
  body("type").exists().withMessage(ErrorList["Parameter error"]),
  body("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("unit").exists().withMessage(ErrorList["Parameter error"]),
  body("unit").notEmpty().withMessage(ErrorList["Parameter error"]),
  ItemController.create
);

router.put("/unit", ItemController.updateUnit);
router.put("/", ItemController.update);

router.get("/setActive/:reference", ItemController.toggleActive);
router.get(
  "/dailyStock/:reference",
  query("start").not().isEmpty().withMessage("Mohon isikan tanggal"),
  query("end").not().isEmpty().withMessage("Mohon isikan tanggal"),
  ItemController.fetchDailyStock
);

router.get(
  "/dailyInputStock/:reference",
  query("start").not().isEmpty().withMessage("Mohon isikan tanggal"),
  ItemController.fetchDailyInputStock
);

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
router.get("/searchStock", ItemController.fetchSearchStock);
router.get("/searchPurchase", ItemController.fetchPurchaseSearchResult);
router.get("/getById/:id", administratorMiddleware, ItemController.fetchById);
router.get("/:reference", ItemController.fetchByReference);
router.get("/", ItemController.fetch);

router.delete(
  "/:itemReference",
  param("itemReference").notEmpty().withMessage(ErrorList["Parameter error"]),
  ItemController.delete
);

export default router;
