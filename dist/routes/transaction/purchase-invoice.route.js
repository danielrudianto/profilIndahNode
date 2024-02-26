"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const purchase_invoice_controller_1 = __importDefault(require("../../controller/purchase-invoice.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/unconfirmed", purchase_invoice_controller_1.default.fetchUnconfirmed);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, purchase_invoice_controller_1.default.fetchByID);
router.post("/archives", purchase_invoice_controller_1.default.fetchArchive);
router.post("/search", purchase_invoice_controller_1.default.search);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Company ID required"]), (0, express_validator_1.body)("supplier_id").notEmpty().withMessage(error_list_1.default["Supplier ID required"]), (0, express_validator_1.body)("uuid").notEmpty().withMessage(error_list_1.default["UUID required"]), error_helper_1.default.intercept, purchase_invoice_controller_1.default.create);
router.put("/confirm", (req, _, next) => {
    req.body.is_confirm = true;
    req.body.is_delete = false;
    next();
}, purchase_invoice_controller_1.default.updateStatus);
router.put("/delete", (req, _, next) => {
    req.body.is_confirm = false;
    req.body.is_delete = true;
    next();
}, purchase_invoice_controller_1.default.updateStatus);
router.put("/", (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Company ID required"]), (0, express_validator_1.body)("supplier_id").notEmpty().withMessage(error_list_1.default["Supplier ID required"]), (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), error_helper_1.default.intercept, purchase_invoice_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, purchase_invoice_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=purchase-invoice.route.js.map