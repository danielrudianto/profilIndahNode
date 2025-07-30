"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_unit_controller_1 = require("../../controller/product-unit.controller");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_unit_repository_1 = require("../../repositories/product-unit.repository");
const router = (0, express_1.Router)();
const productUnitController = new product_unit_controller_1.ProductUnitController(new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma));
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productUnitController.fetch);
router.post("/", (0, express_validator_1.body)("item_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("item_unit").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productUnitController.create);
// router.get("/sales-price/:id", productUnitController.fetchByID);
exports.default = router;
//# sourceMappingURL=product-unit.route.js.map