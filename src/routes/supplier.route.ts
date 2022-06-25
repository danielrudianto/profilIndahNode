import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import SupplierController from "../controller/supplier.controller";

const prisma = new PrismaClient();
const router = Router();

router.get("/autocomplete", SupplierController.getAutocomplete);
router.get("/", SupplierController.getItems);
router.post("/", SupplierController.create);
router.put("/", SupplierController.update);

export default router;
