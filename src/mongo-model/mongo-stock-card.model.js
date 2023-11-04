"use strict";
exports.__esModule = true;
exports.stockCardSchema = void 0;
var mongoose_1 = require("mongoose");
exports.stockCardSchema = new mongoose_1.Schema({
    createdAt: {
        type: Date,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    document: {
        type: String,
        required: true
    },
    opponent: {
        type: String,
        required: true
    },
    displayQuantity: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
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
    salesReturnID: {
        type: Number,
        required: false,
        "default": null
    },
    salesReturnCodeID: {
        type: Number,
        required: false,
        "default": null
    },
    customerID: {
        type: Number,
        required: false,
        "default": null
    },
    supplierID: {
        type: Number,
        required: false,
        "default": null
    },
    currentStock: {
        type: Number,
        required: true,
        "default": 0
    }
});
