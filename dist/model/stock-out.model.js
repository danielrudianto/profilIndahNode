"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockOutModel = void 0;
class StockOutModel {
    // initialize the model with default values
    constructor(data) {
        this.id = data.id;
        this.product_id = data.product_id;
        this.quantity = data.quantity;
        this.sales_invoice_id = data.sales_invoice_id || null;
        this.sales_invoice_code_id = data.sales_invoice_code_id || null;
        this.adjustment_case_id = data.adjustment_case_id || null;
        this.adjustment_case_code_id = data.adjustment_case_code_id || null;
        this.date = data.date;
        this.stock_in_id = data.stock_in_id || null;
        this.price = data.price || 0; // default value for value
    }
}
exports.StockOutModel = StockOutModel;
//# sourceMappingURL=stock-out.model.js.map