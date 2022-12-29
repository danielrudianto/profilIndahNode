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
router.get("/type/getById/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), expense_controller_1.default.fetchTypeById);
router.get("/type/getByParentId", expense_controller_1.default.fetchType);
router.get("/type/getByParentId/:parentId", expense_controller_1.default.fetchType);
router.post("/type", (0, express_validator_1.body)("name")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan nama tipe pengeluaran."), (0, express_validator_1.body)("description")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."), expense_controller_1.default.createType);
router.put("/type", (0, express_validator_1.body)("name").notEmpty().withMessage("Mohon isikan nama tipe pengeluaran."), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."), (0, express_validator_1.body)("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), expense_controller_1.default.updateType);
router.delete("/type/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), expense_controller_1.default.deleteType);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), expense_controller_1.default.fetchById);
router.get("/:year/:month", (0, express_validator_1.param)("year").notEmpty().withMessage("Mohon isikan tahun pengeluaran."), (0, express_validator_1.param)("month").notEmpty().withMessage("Mohon isikan bulan pengeluaran."), expense_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage("Mohon isikan tanggal pengeluaran."), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi pengeluiaran."), (0, express_validator_1.body)("value").notEmpty().withMessage("Mohon isikan nominal pengeluaran."), (0, express_validator_1.body)("expense_type_id")
    .notEmpty()
    .withMessage("Mohon isikan tipe pengeluaran."), expense_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("date").notEmpty().withMessage("Mohon isikan tanggal pengeluaran."), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi pengeluiaran."), (0, express_validator_1.body)("value").notEmpty().withMessage("Mohon isikan nominal pengeluaran."), (0, express_validator_1.body)("expense_type_id")
    .notEmpty()
    .withMessage("Mohon isikan tipe pengeluaran."), (0, express_validator_1.body)("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), expense_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), expense_controller_1.default.deleteById);
exports.default = router;
