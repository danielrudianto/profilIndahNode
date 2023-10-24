"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const supplier_controller_1 = __importDefault(require("../../controller/supplier.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/autocomplete", supplier_controller_1.default.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, supplier_controller_1.default.fetchByID);
router.get("/", supplier_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("address").not().isEmpty().withMessage(error_list_1.default["Address required"]), error_helper_1.default.intercept, supplier_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("address").not().isEmpty().withMessage(error_list_1.default["Address required"]), error_helper_1.default.intercept, supplier_controller_1.default.updateByID);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, supplier_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=supplier.route.js.map