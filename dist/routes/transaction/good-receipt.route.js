"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const good_receipt_controller_1 = __importDefault(require("../../controller/good-receipt.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/search", good_receipt_controller_1.default.search);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("supplier_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, good_receipt_controller_1.default.create);
router.get("/archives", good_receipt_controller_1.default.fetchArchive);
router.get("/code/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID penerimaan barang."), good_receipt_controller_1.default.fetchCodeById);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, good_receipt_controller_1.default.fetchById);
exports.default = router;
