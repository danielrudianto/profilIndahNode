"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const promotion_controller_1 = __importDefault(require("../../controller/promotion.controller"));
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_repository_1 = require("../../repositories/product.repository");
const promotion_repository_1 = require("../../repositories/promotion.repository");
const router = (0, express_1.Router)();
const promotionController = new promotion_controller_1.default(new promotion_repository_1.PromotionRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma));
router.post("/", (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Promotion name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion description required"]), (0, express_validator_1.body)("start_date")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion start date required"]), (0, express_validator_1.body)("end_date")
    .exists()
    .withMessage(error_list_1.default["Promotion end date required"]), (0, express_validator_1.body)("target").notEmpty().withMessage(error_list_1.default["Promotion target required"]), (0, express_validator_1.body)("target")
    .isNumeric()
    .withMessage(error_list_1.default["Promotion target must be numeric"]), (0, express_validator_1.body)("supplier_id")
    .notEmpty()
    .withMessage(error_list_1.default["Supplier ID is required"]), (0, express_validator_1.body)("supplier_id")
    .isNumeric()
    .withMessage(error_list_1.default["Supplier ID must be numeric"]), (0, express_validator_1.body)("promotion_brand")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion brand is required"]), (0, express_validator_1.body)("promotion_brand")
    .isArray()
    .withMessage(error_list_1.default["Promotion brand must be an array"]), error_helper_1.default.intercept, promotionController.create);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, promotionController.fetchByID);
router.get("/", promotionController.fetch);
router.get("/result/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be integer"]), error_helper_1.default.intercept, promotionController.fetchResult);
// router.post("/download", PromotionController.downloadResultByID);
router.put("/", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Promotion name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion description required"]), (0, express_validator_1.body)("start_date")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion start date required"]), (0, express_validator_1.body)("end_date")
    .exists()
    .withMessage(error_list_1.default["Promotion end date required"]), (0, express_validator_1.body)("target").notEmpty().withMessage(error_list_1.default["Promotion target required"]), (0, express_validator_1.body)("target")
    .isNumeric()
    .withMessage(error_list_1.default["Promotion target must be numeric"]), (0, express_validator_1.body)("supplier_id")
    .notEmpty()
    .withMessage(error_list_1.default["Supplier ID is required"]), (0, express_validator_1.body)("supplier_id")
    .isNumeric()
    .withMessage(error_list_1.default["Supplier ID must be numeric"]), (0, express_validator_1.body)("promotion_brand")
    .notEmpty()
    .withMessage(error_list_1.default["Promotion brand is required"]), (0, express_validator_1.body)("promotion_brand")
    .isArray()
    .withMessage(error_list_1.default["Promotion brand must be an array"]), error_helper_1.default.intercept, promotionController.update);
exports.default = router;
//# sourceMappingURL=promotion.route.js.map