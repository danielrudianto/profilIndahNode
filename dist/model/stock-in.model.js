"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockInModel = void 0;
class StockInModel {
    // initialize the model with default values
    constructor(data) {
        this.id = data.id;
        this.date = data.date;
        this.company_id = data.company_id;
        this.quantity = data.quantity;
        this.price = data.price;
        this.good_receipt_id = data.good_receipt_id;
        this.good_receipt_code_id = data.good_receipt_code_id;
        this.adjustment_case_id = data.adjustment_case_id;
        this.adjustment_case_code_id = data.adjustment_case_code_id;
        this.product_id = data.product_id;
        this.residue = data.quantity;
    }
}
exports.StockInModel = StockInModel;
//# sourceMappingURL=stock-in.model.js.map