import { Router } from "express";
import ItemTypeController from "../controller/item_type.controller";

const router = Router();

router.get("/autocomplete", ItemTypeController.fetchAutocomplete);
router.get("/:id", ItemTypeController.fetchById);
router.get("/", ItemTypeController.fetchItems);
router.post("/", ItemTypeController.createItem);
router.put("/", ItemTypeController.updateItem);

export default router;