"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_document_controller_1 = __importDefault(require("../controller/purchase_document.controller"));
const router = (0, express_1.Router)();
router.get("/:id", purchase_document_controller_1.default.fetchById);
router.post("/", purchase_document_controller_1.default.create);
router.put("/", purchase_document_controller_1.default.update);
exports.default = router;
