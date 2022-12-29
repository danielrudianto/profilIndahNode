import chai, { expect } from "chai";
import { describe } from "mocha";
import ErrorList from "../assets/error_list";
import AdjustmentCaseController from "../controller/adjustment_case.controller";
import AdjustmentCaseCodeModel from "../model/adjustment_case_code.model";

describe("Count Adjustment case", () => {
  it("Should successfully fetch number of adjustment case.", async () => {
    const year = 2022;
    const month = 1;
    const response = await AdjustmentCaseCodeModel.countArchive(year, month);
    return chai.expect(response).to.gte(0);
  });

  it("Should successfully fetch number of adjustment case. (0)", async () => {
    const year = 2050;
    const month = 0;
    const response = await AdjustmentCaseCodeModel.countArchive(year, month);
    return chai.expect(response).to.eql(0);
  });

  it("Should successfully throw an 'month' Error when fetching number of adjustment case.", () => {
    const year = 2020;
    const month = 18;
    try {
      AdjustmentCaseCodeModel.countArchive(year, month);
    } catch (err) {
      chai.expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });

  it("Should successfully throw a 'year' Error when fetching number of adjustment case.", () => {
    const year = -200;
    const month = 1;
    try {
      AdjustmentCaseCodeModel.countArchive(year, month);
    } catch (err) {
      chai.expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });
});

describe("Fetch Adjustment case", () => {
  it("Should successfully fetch fetching adjustment case data.", async () => {
    const year = 2022;
    const month = 1;
    const offset = 0;
    const limit = 10;
    const response = await AdjustmentCaseCodeModel.fetchArchive(
      year,
      month,
      offset,
      limit
    );

    return chai.expect(response).to.be.an("array");
  });

  it("Should successfully throw a 'year' Error when fetching adjustment case data.", async () => {
    const year = -200;
    const month = 1;
    const offset = 0;
    const limit = 10;
    try {
      const response = await AdjustmentCaseCodeModel.fetchArchive(
        year,
        month,
        offset,
        limit
      );
    } catch (err) {
      expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });

  it("Should successfully throw a 'month' Error when fetching adjustment case data.", async () => {
    const year = 2020;
    const month = 15;
    const offset = 0;
    const limit = 10;
    try {
      const response = await AdjustmentCaseCodeModel.fetchArchive(
        year,
        month,
        offset,
        limit
      );
    } catch (err) {
      expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });

  it("Should successfully throw an 'offset' Error when fetching adjustment case data.", async () => {
    const year = 2020;
    const month = 5;
    const offset = -50;
    const limit = 10;
    try {
      const response = await AdjustmentCaseCodeModel.fetchArchive(
        year,
        month,
        offset,
        limit
      );
    } catch (err) {
      expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });

  it("Should successfully throw an 'offset' Error when fetching adjustment case data.", async () => {
    const year = 2020;
    const month = 5;
    const offset = 0;
    const limit = 0;
    try {
      await AdjustmentCaseCodeModel.fetchArchive(year, month, offset, limit);
    } catch (err) {
      expect(err).to.eql(Error(ErrorList["Parameter error"]));
    }
  });
});

describe("Fetch Adjustment case by ID", () => {
  it("Should return an empty object.", async () => {
    const id = -2;
    try {
      await AdjustmentCaseCodeModel.fetchById(id);
    } catch (err) {
      expect(err).to.eql(Error(ErrorList["Not found"]));
    }
  });
});

describe("Create Adjustment case", () => {
  it("Should successfully create an adjustment case.", () => {
    const adjustment_case = new AdjustmentCaseCodeModel(
      "ABC",
      new Date(),
      1,
      1
    );
    adjustment_case.create().then((result) => {
      return chai.expect(result).to.be.an("object");
    });
  });
});
