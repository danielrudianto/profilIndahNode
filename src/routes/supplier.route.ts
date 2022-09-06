import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { body } from "express-validator";
import SupplierController from "../controller/supplier.controller";

const prisma = new PrismaClient();
const router = Router();

router.get("/autocomplete", SupplierController.getAutocomplete);
router.get("/:id", SupplierController.fetchById);
router.get("/", SupplierController.getItems);
router.post(
  "/",
  body("name").not().isEmpty().withMessage("Mohon isikan nama supplier."),
  body("address").not().isEmpty().withMessage("Mohon isikan alamat supplier"),
  SupplierController.create
);
router.put("/", SupplierController.update);

export default router;
