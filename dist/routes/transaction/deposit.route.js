"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deposit_controller_1 = __importDefault(require("../../controller/deposit.controller"));
const router = (0, express_1.Router)();
router.get("/:id", deposit_controller_1.default.fetchByID);
router.get("/", deposit_controller_1.default.fetch);
router.post("/confirm", deposit_controller_1.default.confirmByID);
router.post("/archives", deposit_controller_1.default.fetchArchive);
router.delete("/:id", deposit_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=deposit.route.js.map