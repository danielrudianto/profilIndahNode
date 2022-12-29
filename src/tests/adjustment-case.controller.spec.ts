import Sinon from "sinon";
import AdjustmentCaseController from "../controller/adjustment_case.controller";
import AdjustmentCaseCodeModel from "../model/adjustment_case_code.model";

describe("Adjustment case controller", () => {
  Sinon.stub(AdjustmentCaseCodeModel, "fetchById");
  const request = {
    body: {
      name: "ABC",
      date: new Date(),
      created_by: 1,
    },
  };

//   AdjustmentCaseController.post(request, {});
});
