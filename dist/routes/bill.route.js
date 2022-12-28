"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bill_controller_1 = __importDefault(require("../controller/bill.controller"));
const auth_helper_1 = require("../helper/auth.helper");
const router = (0, express_1.Router)();
router.post("/printout/draft", (0, express_validator_1.body)("items").isArray().withMessage("Mohon isikan barang."), bill_controller_1.default.createPrintoutDraft);
router.post("/printout", bill_controller_1.default.createPrintout);
router.post("/", (0, express_validator_1.body)("customer_id").exists().withMessage("Mohon isikan ID pelanggan."), (0, express_validator_1.body)("payment_method_id")
    .exists()
    .withMessage("Mohon isikan metode pembayaran."), (0, express_validator_1.body)("discount")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai potongan harga."), (0, express_validator_1.body)("delivery")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai pengiriman barang."), (0, express_validator_1.body)("service")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai jasa."), bill_controller_1.default.create);
router.get("/archives", bill_controller_1.default.fetchArchive);
router.get("/archives/:year", (0, express_validator_1.param)("year").exists().withMessage("Mohon isikan tahun arsip."), bill_controller_1.default.fetchArchive);
router.get("/archives/:year/:month", (0, express_validator_1.param)("year").exists().withMessage("Mohon isikan tahun arsip."), (0, express_validator_1.param)("month").exists().withMessage("Mohon isikan bulan arsip."), bill_controller_1.default.fetchArchive);
router.get("/code/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID bill."), bill_controller_1.default.fetchCodeById);
router.get("/search", bill_controller_1.default.searchArchive);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID bill."), bill_controller_1.default.fetchById);
router.delete("/:id", auth_helper_1.administratorMiddleware, bill_controller_1.default.deleteById);
exports.default = router;
