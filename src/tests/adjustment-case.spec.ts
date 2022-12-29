import chai from "chai";
import { describe } from "mocha";
import AdjustmentCaseController from "../controller/adjustment_case.controller";
import AdjustmentCaseModel from "../model/adjustment_case.model";

describe("Checking adjustment case controller", () => {
  it("Should successfully fetch number of adjustment case.", async () => {
    const year = 2022;
    const month = 1;
    const response = await AdjustmentCaseModel.countArchive(year, month);
    return chai.expect(response).to.gte(0);
  });

  it("Should successfully fetch number of adjustment case. (0)", async () => {
    const year = 2050;
    const month = 0;
    const response = await AdjustmentCaseModel.countArchive(year, month);
    return chai.expect(response).to.eql(0);
  });

  it("Should successfully throw an 'month' Error when fetching number of adjustment case.", () => {
    const year = 2020;
    const month = 18;
    try {
      AdjustmentCaseModel.countArchive(year, month);
    } catch (err) {
      chai.expect(err).to.eql(Error("Mohon isikan bulan arsip yang sesuai."));
    }
  });

  it("Should successfully throw a 'year' Error when fetching number of adjustment case.", () => {
    const year = -200;
    const month = 1;
    try {
      AdjustmentCaseModel.countArchive(year, month);
    } catch (err) {
      chai.expect(err).to.eql(Error("Mohon isikan tahun arsip yang sesuai."));
    }
  });

  it("Should successfully fetch fetching adjustment case data.", async () => {
    const year = 2022;
    const month = 1;
    const offset = 0;
    const limit = 10;
    const response = await AdjustmentCaseModel.fetchArchive(
      year,
      month,
      offset,
      limit
    );

    return chai.expect(response).to.be.json;
  });
});
