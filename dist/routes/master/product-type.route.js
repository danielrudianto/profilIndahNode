"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_type_controller_1 = require("../../controller/product-type.controller");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_type_repository_1 = require("../../repositories/product-type.repository");
const router = (0, express_1.Router)();
const productTypeController = new product_type_controller_1.ProductTypeController(new product_type_repository_1.ProductTypeRepository(database_helper_1.prisma));
router.get("/autocomplete", productTypeController.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productTypeController.fetchByID);
router.get("/", productTypeController.fetch);
router.post("/", productTypeController.create);
router.put("/", productTypeController.update);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productTypeController.delete);
exports.default = router;
//# sourceMappingURL=product-type.route.js.map