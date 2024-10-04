"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const draft_bill_controller_1 = __importDefault(require("../../controller/draft-bill.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const fetch_interface_1 = require("../../interface/fetch.interface");
const router = (0, express_1.Router)();
router.post("/confirm", (0, express_validator_1.body)("payment_methods")
    .notEmpty()
    .withMessage(error_list_1.default["Payment method required"]), (0, express_validator_1.body)("payment_methods")
    .isArray()
    .withMessage(error_list_1.default["Payment method required"]), (0, express_validator_1.body)("service").notEmpty().withMessage(error_list_1.default["Service required"]), (0, express_validator_1.body)("delivery").notEmpty().withMessage(error_list_1.default["Delivery required"]), (0, express_validator_1.body)("discount").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), error_helper_1.default.intercept, draft_bill_controller_1.default.confirmByID);
router.post("/delete", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), error_helper_1.default.intercept, draft_bill_controller_1.default.deleteByID);
router.post("/", (0, express_validator_1.body)("customer_id").exists().withMessage("Please fill in customer ID"), (0, express_validator_1.body)("note").exists().withMessage("Please fill in note"), (0, express_validator_1.body)("items").exists().withMessage("Please fill in items"), (0, express_validator_1.body)("service").exists().withMessage("Please fill in the service value"), (0, express_validator_1.body)("delivery").exists().withMessage("Please fill in the delivery value"), error_helper_1.default.intercept, draft_bill_controller_1.default.create);
router.get("/archives", draft_bill_controller_1.default.fetchArchives);
router.get("/unconfirmed", (req, _, next) => {
    req.body.mode = fetch_interface_1.fetchMode.Unconfirmed;
    next();
}, draft_bill_controller_1.default.fetch);
router.get("/name/:name", draft_bill_controller_1.default.fetchByName);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, draft_bill_controller_1.default.fetchByID);
router.get("/", (req, _, next) => {
    req.body.mode = fetch_interface_1.fetchMode.Pagination;
    next();
}, draft_bill_controller_1.default.fetch);
exports.default = router;
//# sourceMappingURL=draft-bill.route.js.map