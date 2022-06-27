import { Router } from "express";
import CompanyController from "../controller/company.controller";

const router = Router();

router.post("/", CompanyController.create);
router.get("/autocomplete", CompanyController.getAutocomplete);
router.get("/:id", CompanyController.fetchById);
router.get("/", CompanyController.fetch);
router.delete("/:companyId", CompanyController.delete);
router.put("/", CompanyController.update);

export default router;
