var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chai from "chai";
import { describe } from "mocha";
import AdjustmentCaseModel from "../model/adjustment_case.model";
describe("Checking adjustment case controller", () => {
    it("Should successfully fetch number of adjustment case.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2022;
        const month = 1;
        const response = yield AdjustmentCaseModel.countArchive(year, month);
        return chai.expect(response).to.gte(0);
    }));
    it("Should successfully fetch number of adjustment case. (0)", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2050;
        const month = 0;
        const response = yield AdjustmentCaseModel.countArchive(year, month);
        return chai.expect(response).to.eql(0);
    }));
    it("Should successfully throw an 'month' Error when fetching number of adjustment case.", () => {
        const year = 2020;
        const month = 18;
        try {
            AdjustmentCaseModel.countArchive(year, month);
        }
        catch (err) {
            chai.expect(err).to.eql(Error("Mohon isikan bulan arsip yang sesuai."));
        }
    });
    it("Should successfully throw a 'year' Error when fetching number of adjustment case.", () => {
        const year = -200;
        const month = 1;
        try {
            AdjustmentCaseModel.countArchive(year, month);
        }
        catch (err) {
            chai.expect(err).to.eql(Error("Mohon isikan tahun arsip yang sesuai."));
        }
    });
    it("Should successfully fetch fetching adjustment case data.", () => __awaiter(void 0, void 0, void 0, function* () {
        const year = 2022;
        const month = 1;
        const offset = 0;
        const limit = 10;
        const response = yield AdjustmentCaseModel.fetchArchive(year, month, offset, limit);
        return chai.expect(response).to.be.json;
    }));
});
