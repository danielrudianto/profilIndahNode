"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const adjustment_case_controller_1 = __importDefault(require("../controller/adjustment_case.controller"));
const router = (0, express_1.Router)();
router.get("/archives/:year/:month", (0, express_validator_1.param)("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."), (0, express_validator_1.param)("month")
    .isInt({ min: 0, max: 11 })
    .withMessage("Mohon isikan bulan arsip yang sesuai."), adjustment_case_controller_1.default.fetchArchives);
router.get("/archives/:year", (0, express_validator_1.param)("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."), adjustment_case_controller_1.default.fetchArchives);
router.get("/archives", adjustment_case_controller_1.default.fetchArchives);
router.get("/code/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."), adjustment_case_controller_1.default.fetchCodeById);
router.get("/:id", (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage("Mohon isikan ID penyesuaian stock."), adjustment_case_controller_1.default.fetchById);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage("Mohon isikan tanggal dokumen."), (0, express_validator_1.body)("company_id")
    .isInt({ min: 1 })
    .withMessage("Mohon isikan ID perusahaan."), (0, express_validator_1.body)("type")
    .isInt({ min: 0 })
    .withMessage("Mohon isikan tipe penyesuaian stock yang sesuai."), adjustment_case_controller_1.default.post);
router.delete("/:id", (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(""), adjustment_case_controller_1.default.deleteById);
exports.default = router;
