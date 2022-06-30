"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const expense_controller_1 = __importDefault(require("../controller/expense.controller"));
const router = (0, express_1.Router)();
router.get("/parentAutocomplete", expense_controller_1.default.parentAutocomplete);
router.get("/itemAutocomplete", expense_controller_1.default.itemAutocomplete);
router.get("/type/getById/:id", expense_controller_1.default.fetchTypeById);
router.get("/type/getByParentId", expense_controller_1.default.fetchType);
router.get("/type/getByParentId/:parentId", expense_controller_1.default.fetchType);
router.post("/type", (0, express_validator_1.body)("name")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan nama tipe pengeluaran."), (0, express_validator_1.body)("description")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."), expense_controller_1.default.createType);
router.put("/type", expense_controller_1.default.updateType);
router.delete("/type/:id", expense_controller_1.default.deleteType);
router.get("/:year/:month", expense_controller_1.default.fetch);
router.post("/", expense_controller_1.default.create);
exports.default = router;
