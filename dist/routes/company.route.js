"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const company_controller_1 = __importDefault(require("../controller/company.controller"));
const router = (0, express_1.Router)();
router.post("/", (0, express_validator_1.body)("code_name")
    .isLength({ min: 3, max: 3 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("address").exists().withMessage(error_list_1.default["Parameter error"]), company_controller_1.default.create);
router.get("/autocomplete", company_controller_1.default.getAutocomplete);
router.get("/available", company_controller_1.default.fetchAvailable);
router.get("/:id", (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), company_controller_1.default.fetchById);
router.get("/", company_controller_1.default.fetch);
router.delete("/:companyId", company_controller_1.default.delete);
router.put("/", company_controller_1.default.update);
exports.default = router;
