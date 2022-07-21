import { Router } from "express";
import { query } from "express-validator";
import ItemController from "../controller/item.controller";

const router = Router();

router.post("/", ItemController.create);
router.delete("/:itemReference", ItemController.delete);
router.put("/", ItemController.update);
router.get("/insufficient", ItemController.fetchInsufficient);
router.get("/stock", query("reference").not().isEmpty().withMessage("Referensi barang wajib diisikan."), ItemController.fetchStock);
router.get("/:reference", ItemController.fetchByReference);
router.get("/", ItemController.fetch);

export default router;
