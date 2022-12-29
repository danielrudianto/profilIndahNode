"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const item_controller_1 = __importDefault(require("../controller/item.controller"));
const auth_helper_1 = require("../helper/auth.helper");
const router = (0, express_1.Router)();
router.post("/stock/download", item_controller_1.default.downloadStock);
router.post("/stockReport/pdf", item_controller_1.default.fetchStockReportPdf);
router.post("/stockReport", item_controller_1.default.fetchStockReport);
router.post("/", item_controller_1.default.create);
router.put("/unit", item_controller_1.default.updateUnit);
router.put("/", item_controller_1.default.update);
router.get("/setActive/:reference", item_controller_1.default.toggleActive);
router.get("/dailyStock/:reference", (0, express_validator_1.query)("start").not().isEmpty().withMessage("Mohon isikan tanggal"), (0, express_validator_1.query)("end").not().isEmpty().withMessage("Mohon isikan tanggal"), item_controller_1.default.fetchDailyStock);
router.get("/stock", (0, express_validator_1.query)("reference")
    .not()
    .isEmpty()
    .withMessage("Referensi barang wajib diisikan."), item_controller_1.default.fetchStock);
router.get("/units/:reference", item_controller_1.default.fetchUnits);
router.get("/search", item_controller_1.default.fetchSearchResult);
router.get("/searchStock", item_controller_1.default.fetchSearchStock);
router.get("/searchPurchase", item_controller_1.default.fetchPurchaseSearchResult);
router.get("/getById/:id", auth_helper_1.administratorMiddleware, item_controller_1.default.fetchById);
router.get("/:reference", item_controller_1.default.fetchByReference);
router.get("/", item_controller_1.default.fetch);
router.delete("/:itemReference", item_controller_1.default.delete);
exports.default = router;
