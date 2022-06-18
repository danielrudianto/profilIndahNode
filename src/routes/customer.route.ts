import { Router } from "express";
import { body, param, query } from "express-validator";
import CustomerController from "../controller/customer.controller";

const router = Router();

router.post(
    "/",
    body("name").not().isEmpty().withMessage("Nama wajib diisi."),
    body("address").not().isEmpty().withMessage("Alamat wajib diisi."),
    body("pic").not().isEmpty().withMessage("PIC wajib diisi."),
    body("phone_number").not().isEmpty().withMessage("Nomor telepon wajib diisi."),
    CustomerController.create
);

router.put(
    "/", 
    body("id").not().isEmpty().withMessage("ID wajib diisi."),
    body("name").not().isEmpty().withMessage("Nama wajib diisi."),
    body("address").not().isEmpty().withMessage("Alamat wajib diisi."),
    body("pic").not().isEmpty().withMessage("PIC wajib diisi."),
    body("phone_number").not().isEmpty().withMessage("Nomor telepon wajib diisi."),
    CustomerController.update
);

router.delete(
    "/:id", 
    CustomerController.delete,
    param("id").not().isEmpty().withMessage("Data tidak ditemukan.")
);

router.get(
    "/autocomplete", 
    [
        query("keyword").not().isEmpty().withMessage("")
    ],
    CustomerController.fetchAutocomplete
);

router.get(
    "/",
    CustomerController.fetch
);

export default router;