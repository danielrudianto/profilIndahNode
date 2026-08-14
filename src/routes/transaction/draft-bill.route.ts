import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../constants/error_list";
import DraftBillController from "../../controllers/draft-bill.controller";
import ErrorHelper from "../../utils/error.helper";

const router = Router();

router.post(
  "/confirm",
  body("payment_methods")
    .notEmpty()
    .withMessage(ErrorList["Payment method required"]),
  body("payment_methods")
    .isArray()
    .withMessage(ErrorList["Payment method required"]),
  body("service").notEmpty().withMessage(ErrorList["Service required"]),
  body("delivery").notEmpty().withMessage(ErrorList["Delivery required"]),
  body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  DraftBillController.confirmByID
);

router.post(
  "/delete",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  DraftBillController.deleteByID
);

router.post(
  "/",
  body("customer_id").exists().withMessage("Please fill in customer ID"),
  body("note").exists().withMessage("Please fill in note"),
  body("items").exists().withMessage("Please fill in items"),
  body("service").exists().withMessage("Please fill in the service value"),
  body("delivery").exists().withMessage("Please fill in the delivery value"),
  ErrorHelper.intercept,
  DraftBillController.create
);

router.get("/archives", DraftBillController.fetchArchives);
// router.get(
//   "/unconfirmed",
//   (req: Request, _, next: NextFunction) => {
//     req.body.mode = fetchMode.Unconfirmed;
//     next();
//   },
//   DraftBillController.fetch
// );
router.get("/name/:name", DraftBillController.fetchByName);
/*
  GET /:id dihapus. Handler-nya hanya berisi kode yang dikomentari, jadi
  permintaan tidak pernah dibalas.
*/
// router.get(
//   "/",
//   (req: Request, _, next: NextFunction) => {
//     req.body.mode = fetchMode.Pagination;
//     next();
//   },
//   DraftBillController.fetch
// );

export default router;
