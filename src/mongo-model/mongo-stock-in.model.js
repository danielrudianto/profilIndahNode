"use strict";
exports.__esModule = true;
exports.mongoStockInModel = void 0;
var mongoose_1 = require("mongoose");
var stockOutSchema = new mongoose_1.Schema({
    billID: {
        type: Number,
        required: false,
        "default": null
    },
    billCodeID: {
        type: Number,
        required: false,
        "default": null
    },
    adjustmentCaseID: {
        type: Number,
        required: false,
        "default": null
    },
    adjustmentCaseCodeID: {
        type: Number,
        required: false,
        "default": null
    },
    date: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    value: {
        type: Number,
        required: true,
        "default": 0
    }
});
var StockInSchema = new mongoose_1.Schema({
    companyID: {
        type: Number,
        required: true
    },
    adjustmentCaseID: {
        type: Number,
        required: false,
        "default": null
    },
    adjustmentCaseCodeID: {
        type: Number,
        required: false,
        "default": null
    },
    goodReceiptID: {
        type: Number,
        required: false,
        "default": null
    },
    goodReceiptCodeID: {
        type: Number,
        required: false,
        "default": null
    },
    date: {
        type: Date,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    residue: {
        type: Number,
        required: true
    },
    itemID: {
        type: Number,
        required: true
    },
    stockOut: {
        type: [stockOutSchema],
        "default": []
    }
});
exports.mongoStockInModel = (0, mongoose_1.model)("stock-ins", StockInSchema);
