"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// const purchaseInvoiceController = new PurchaseInvoiceController(
//   new PurchaseInvoiceRepository(prisma),
//   new GoodReceiptRepository(prisma)
// );
// router.get("/unconfirmed", purchaseInvoiceController.fetchUnconfirmed);
// router.get(
//   "/:id",
//   param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
//   param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
//   ErrorHelper.intercept,
//   purchaseInvoiceController.fetchByID
// );
// router.post("/archives", PurchaseInvoiceController.fetchArchive);
// router.post("/archives/v2", PurchaseInvoiceController.fetchArchiveV2);
// router.post("/search", PurchaseInvoiceController.search);
// router.post(
//   "/",
//   body("date").notEmpty().withMessage(ErrorList["Date required"]),
//   body("name").notEmpty().withMessage(ErrorList["Name required"]),
//   body("company_id").notEmpty().withMessage(ErrorList["Company ID required"]),
//   body("supplier_id").notEmpty().withMessage(ErrorList["Supplier ID required"]),
//   body("uuid").notEmpty().withMessage(ErrorList["UUID required"]),
//   ErrorHelper.intercept,
//   putriForbiddenMiddleware,
//   purchaseInvoiceController.create
// );
// router.put(
//   "/confirm",
//   (req: Request, _, next: NextFunction) => {
//     req.body.is_confirm = true;
//     req.body.is_delete = false;
//     next();
//   },
//   purchaseInvoiceController.updateStatus
// );
// router.put(
//   "/delete",
//   (req: Request, _, next: NextFunction) => {
//     req.body.is_confirm = false;
//     req.body.is_delete = true;
//     next();
//   },
//   purchaseInvoiceController.updateStatus
// );
// router.put(
//   "/",
//   body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
//   body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
//   body("name").notEmpty().withMessage(ErrorList["Name required"]),
//   body("company_id").notEmpty().withMessage(ErrorList["Company ID required"]),
//   body("supplier_id").notEmpty().withMessage(ErrorList["Supplier ID required"]),
//   body("date").notEmpty().withMessage(ErrorList["Date required"]),
//   ErrorHelper.intercept,
//   PurchaseInvoiceController.update
// );
// router.delete(
//   "/:id",
//   param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
//   param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
//   ErrorHelper.intercept,
//   purchaseInvoiceController.delete
// );
exports.default = router;
//# sourceMappingURL=purchase-invoice.route.js.map