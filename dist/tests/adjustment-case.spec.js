"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importStar(require("chai"));
const mocha_1 = require("mocha");
const error_list_1 = __importDefault(require("../assets/error_list"));
const adjustment_case_code_model_1 = __importDefault(require("../model/adjustment_case_code.model"));
(0, mocha_1.describe)("Count Adjustment case", () => {
    it("Should successfully fetch number of adjustment case.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2022;
        const month = 1;
        const response = yield adjustment_case_code_model_1.default.countArchive(year, month);
        return chai_1.default.expect(response).to.gte(0);
    }));
    it("Should successfully fetch number of adjustment case. (0)", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2050;
        const month = 0;
        const response = yield adjustment_case_code_model_1.default.countArchive(year, month);
        return chai_1.default.expect(response).to.eql(0);
    }));
    it("Should successfully throw an 'month' Error when fetching number of adjustment case.", () => {
        const year = 2020;
        const month = 18;
        try {
            adjustment_case_code_model_1.default.countArchive(year, month);
        }
        catch (err) {
            chai_1.default.expect(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    });
    it("Should successfully throw a 'year' Error when fetching number of adjustment case.", () => {
        const year = -200;
        const month = 1;
        try {
            adjustment_case_code_model_1.default.countArchive(year, month);
        }
        catch (err) {
            chai_1.default.expect(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    });
});
(0, mocha_1.describe)("Fetch Adjustment case", () => {
    it("Should successfully fetch fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2022;
        const month = 1;
        const offset = 0;
        const limit = 10;
        const response = yield adjustment_case_code_model_1.default.fetchArchive(year, month, offset, limit);
        return chai_1.default.expect(response).to.be.an("array");
    }));
    it("Should successfully throw a 'year' Error when fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = -200;
        const month = 1;
        const offset = 0;
        const limit = 10;
        try {
            const response = yield adjustment_case_code_model_1.default.fetchArchive(year, month, offset, limit);
        }
        catch (err) {
            (0, chai_1.expect)(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    }));
    it("Should successfully throw a 'month' Error when fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2020;
        const month = 15;
        const offset = 0;
        const limit = 10;
        try {
            const response = yield adjustment_case_code_model_1.default.fetchArchive(year, month, offset, limit);
        }
        catch (err) {
            (0, chai_1.expect)(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    }));
    it("Should successfully throw an 'offset' Error when fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2020;
        const month = 5;
        const offset = -50;
        const limit = 10;
        try {
            const response = yield adjustment_case_code_model_1.default.fetchArchive(year, month, offset, limit);
        }
        catch (err) {
            (0, chai_1.expect)(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    }));
    it("Should successfully throw an 'offset' Error when fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2020;
        const month = 5;
        const offset = 0;
        const limit = 0;
        try {
            yield adjustment_case_code_model_1.default.fetchArchive(year, month, offset, limit);
        }
        catch (err) {
            (0, chai_1.expect)(err).to.eql(Error(error_list_1.default["Parameter error"]));
        }
    }));
});
(0, mocha_1.describe)("Fetch Adjustment case by ID", () => {
    it("Should return an empty object.", () => __awaiter(void 0, void 0, void 0, function* () {
        const id = -2;
        try {
            yield adjustment_case_code_model_1.default.fetchById(id);
        }
        catch (err) {
            (0, chai_1.expect)(err).to.eql(Error(error_list_1.default["Not found"]));
        }
    }));
});
(0, mocha_1.describe)("Create Adjustment case", () => {
    it("Should successfully create an adjustment case.", () => {
        const adjustment_case = new adjustment_case_code_model_1.default("ABC", new Date(), 1, 1);
        adjustment_case.create().then((result) => {
            return chai_1.default.expect(result).to.be.an("object");
        });
    });
});
