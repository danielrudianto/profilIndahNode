"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promotion_controller_1 = __importDefault(require("../../controller/promotion.controller"));
const router = (0, express_1.Router)();
router.get("/result/:id", promotion_controller_1.default.fetchResultByID);
router.get("/active", promotion_controller_1.default.fetchActive);
router.get("/:id", promotion_controller_1.default.fetchByID);
router.get("/", promotion_controller_1.default.fetch);
router.post("/", promotion_controller_1.default.create);
router.put("/", promotion_controller_1.default.update);
exports.default = router;
//# sourceMappingURL=promotion.route.js.map