"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_document_controller_1 = __importDefault(require("../controller/purchase_document.controller"));
const router = (0, express_1.Router)();
router.get("/unconfirmed", purchase_document_controller_1.default.fetchUnconfirmed);
router.get("/:id", purchase_document_controller_1.default.fetchById);
router.post("/confirm", purchase_document_controller_1.default.confirm);
router.post("/", purchase_document_controller_1.default.create);
router.put("/", purchase_document_controller_1.default.update);
router.delete("/:id", purchase_document_controller_1.default.delete);
exports.default = router;
