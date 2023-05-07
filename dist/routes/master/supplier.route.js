"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const supplier_controller_1 = __importDefault(require("../../controller/supplier.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", supplier_controller_1.default.getAutocomplete);
router.get("/:id", supplier_controller_1.default.fetchById);
router.get("/", supplier_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("address").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), supplier_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("address").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), supplier_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().isNumeric().withMessage(error_list_1.default["Parameter error"]), supplier_controller_1.default.delete);
exports.default = router;
