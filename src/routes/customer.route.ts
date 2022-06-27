import { Router } from "express";
import { body, param, query } from "express-validator";
import CustomerController from "../controller/customer.controller";

const router = Router();

router.post(
  "/",
  body("name").not().isEmpty().withMessage("Nama wajib diisi."),
  body("address").not().isEmpty().withMessage("Alamat wajib diisi."),
  body("pic").not().isEmpty().withMessage("PIC wajib diisi."),
  CustomerController.create
);

router.put(
  "/",
  body("id").not().isEmpty().withMessage("ID wajib diisi."),
  body("name").not().isEmpty().withMessage("Nama wajib diisi."),
  body("address").not().isEmpty().withMessage("Alamat wajib diisi."),
  body("pic").not().isEmpty().withMessage("PIC wajib diisi."),
  CustomerController.update
);

router.delete(
  "/:id",
  param("id").not().isEmpty().withMessage("Data tidak ditemukan."),
  CustomerController.delete
);

router.get(
  "/:id",
  param("id").not().isEmpty().withMessage("ID konsumen wajib diisi."),
  CustomerController.fetchById
);

router.get(
  "/autocomplete",
  CustomerController.fetchAutocomplete
);

router.get("/", CustomerController.fetch);

export default router;
