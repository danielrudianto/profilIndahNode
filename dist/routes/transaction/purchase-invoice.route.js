"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_invoice_controller_1 = __importDefault(require("../../controller/purchase-invoice.controller"));
const router = (0, express_1.Router)();
router.get("/unconfirmed", purchase_invoice_controller_1.default.fetchUnconfirmed);
router.get("/archives", purchase_invoice_controller_1.default.fetchArchive);
router.get("/:id", purchase_invoice_controller_1.default.fetchById);
router.post("/search", purchase_invoice_controller_1.default.searchArchive);
router.post("/", purchase_invoice_controller_1.default.create);
router.put("/confirm", purchase_invoice_controller_1.default.confirm);
router.put("/delete", purchase_invoice_controller_1.default.delete);
router.put("/", purchase_invoice_controller_1.default.update);
exports.default = router;
