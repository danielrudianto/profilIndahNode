"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const item_controller_1 = __importDefault(require("../controller/item.controller"));
const router = (0, express_1.Router)();
router.post("/", item_controller_1.default.create);
router.delete("/:itemReference", item_controller_1.default.delete);
router.put("/", item_controller_1.default.update);
router.get("/:reference", item_controller_1.default.fetchByReference);
router.get("/", item_controller_1.default.fetch);
exports.default = router;
