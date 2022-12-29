"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon_1 = __importDefault(require("sinon"));
const adjustment_case_code_model_1 = __importDefault(require("../model/adjustment_case_code.model"));
describe("Adjustment case controller", () => {
    sinon_1.default.stub(adjustment_case_code_model_1.default, "fetchById");
    const request = {
        body: {
            name: "ABC",
            date: new Date(),
            created_by: 1,
        },
    };
    //   AdjustmentCaseController.post(request, {});
});
