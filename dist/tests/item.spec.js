"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const item_model_1 = require("../model/item.model");
describe("Create item", () => {
    it("Should create a new item.", () => {
        const item = new item_model_1.ItemModel("AB-CD", "AB-CD", -5, 1, 1, 1, 'PCS');
        item.create().then(result => {
            (0, chai_1.expect)(result).to.be.an("object");
        });
    });
});
