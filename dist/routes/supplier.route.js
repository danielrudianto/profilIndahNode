"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const supplier_controller_1 = __importDefault(require("../controller/supplier.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", supplier_controller_1.default.getAutocomplete);
router.get("/:id", supplier_controller_1.default.fetchById);
router.get("/", supplier_controller_1.default.getItems);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage("Mohon isikan nama supplier."), (0, express_validator_1.body)("address").not().isEmpty().withMessage("Mohon isikan alamat supplier"), supplier_controller_1.default.create);
router.put("/", supplier_controller_1.default.update);
exports.default = router;
