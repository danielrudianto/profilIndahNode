"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const good_receipt_controller_1 = __importDefault(require("../controller/good_receipt.controller"));
const router = (0, express_1.Router)();
router.post("/", (0, express_validator_1.body)("date").not().isEmpty().withMessage("Tanggal wajib diisi."), (0, express_validator_1.body)("name").not().isEmpty().withMessage("Nama dokumen wajib diisi."), (0, express_validator_1.body)("company_id").not().isEmpty().withMessage("Perusahaan wajib diisi."), (0, express_validator_1.body)("supplier_id").not().isEmpty().withMessage("Supplier wajib diisi."), (0, express_validator_1.body)("purchase_invoice_name")
    .not()
    .isEmpty()
    .withMessage("Nama dokumen pembelian wajib diisi."), (0, express_validator_1.body)("discount")
    .not()
    .isEmpty()
    .withMessage("Nominal potongan harga pembelian wajib diisi."), (0, express_validator_1.body)("discount")
    .isNumeric()
    .withMessage("Nominal potongan harga pembelian wajib diisi."), good_receipt_controller_1.default.create);
router.get("/search", good_receipt_controller_1.default.searchArchive);
router.get("/archives", good_receipt_controller_1.default.fetchArchive);
router.get("/archives/:year", good_receipt_controller_1.default.fetchArchive);
router.get("/archives/:year/:month", good_receipt_controller_1.default.fetchArchive);
router.get("/code/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID penerimaan barang."), good_receipt_controller_1.default.fetchCodeById);
router.get("/:id", (0, express_validator_1.param)("id")
    .notEmpty()
    .withMessage("Mohon isikan ID dokumen penerimaan barang."), good_receipt_controller_1.default.fetchById);
exports.default = router;
