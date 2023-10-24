"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_type_controller_1 = __importDefault(require("../../controller/product-type.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/autocomplete", product_type_controller_1.default.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_type_controller_1.default.fetchByID);
router.get("/", product_type_controller_1.default.fetch);
router.post("/", product_type_controller_1.default.create);
router.put("/", product_type_controller_1.default.updateByID);
router.delete("/:id", product_type_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=product-type.route.js.map