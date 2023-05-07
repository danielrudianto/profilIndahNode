import { Router } from "express";
import ItemTypeController from "../../controller/product-type.controller";

const router = Router();

router.get("/autocomplete", ItemTypeController.fetchAutocomplete);
router.get("/:id", ItemTypeController.fetchById);
router.get("/", ItemTypeController.fetch);

router.post("/getByBrandIds", ItemTypeController.fetchByBrandId);
router.post("/", ItemTypeController.createItem);
router.put("/", ItemTypeController.updateItem);

router.delete("/:id", ItemTypeController.deleteItem);

export default router;