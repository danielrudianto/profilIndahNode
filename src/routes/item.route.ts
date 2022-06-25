import { Router } from "express";
import ItemController from "../controller/item.controller";

const router = Router();

router.post("/", ItemController.create);
router.delete("/:itemReference", ItemController.delete);
router.put("/", ItemController.update);
router.get("/:reference", ItemController.fetchByReference);
router.get("/", ItemController.fetch);

export default router;
