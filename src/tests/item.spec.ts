import { expect } from "chai";
import { item } from "../interface/item";
import { ItemModel } from "../model/item.model";

describe("Create item", () => {
  it("Should create a new item.", () => {
    const item = new ItemModel("AB-CD", "AB-CD", -5, 1, 1,1, 'PCS');
    item.create().then(result => {
        expect(result).to.be.an("object");
    })
  });
});
