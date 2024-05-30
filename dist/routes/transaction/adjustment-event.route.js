"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const adjustment_event_controller_1 = __importDefault(require("../../controller/adjustment-event.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/archives/v2", adjustment_event_controller_1.default.fetchArchivesV2);
router.post("/archives", adjustment_event_controller_1.default.fetchArchives);
router.get("/code/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."), error_helper_1.default.intercept, adjustment_event_controller_1.default.fetchCodeByID);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, adjustment_event_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("type").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, adjustment_event_controller_1.default.create);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, adjustment_event_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=adjustment-event.route.js.map