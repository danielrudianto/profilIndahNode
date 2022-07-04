"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const payment_method_controller_1 = __importDefault(require("../controller/payment_method.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", payment_method_controller_1.default.fetchAutocomplete);
router.get("/:id", payment_method_controller_1.default.fetchById);
router.get("/", payment_method_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage("Mohon isikan nama metode pembayaran."), (0, express_validator_1.body)("description").not().isEmpty().withMessage("Mohon isikan deskripsi metode pembayaran."), payment_method_controller_1.default.submit);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage("Mohon isikan ID metode pembayaran."), (0, express_validator_1.body)("name").not().isEmpty().withMessage("Mohon isikan nama metode pembayaran."), (0, express_validator_1.body)("description").not().isEmpty().withMessage("Mohon isikan deskripsi metode pembayaran."), payment_method_controller_1.default.update);
router.delete("/:id", payment_method_controller_1.default.delete);
exports.default = router;
