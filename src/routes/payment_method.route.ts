import { Router } from "express";
import { body } from "express-validator";
import PaymentMethodController from "../controller/payment_method.controller";

const router = Router();

router.get("/autocomplete", PaymentMethodController.fetchAutocomplete);
router.get("/:id", PaymentMethodController.fetchById);
router.get("/", PaymentMethodController.fetch);
router.post(
  "/",
  body("name").not().isEmpty().withMessage("Mohon isikan nama metode pembayaran."),
  body("description").not().isEmpty().withMessage("Mohon isikan deskripsi metode pembayaran."),
  PaymentMethodController.submit
);

router.put("/",
  body("id").not().isEmpty().withMessage("Mohon isikan ID metode pembayaran."),
  body("name").not().isEmpty().withMessage("Mohon isikan nama metode pembayaran."),
  body("description").not().isEmpty().withMessage("Mohon isikan deskripsi metode pembayaran."),
  PaymentMethodController.update
);

router.delete("/:id", PaymentMethodController.delete);

export default router;
