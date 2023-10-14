"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoStockInModel = void 0;
const mongoose_1 = require("mongoose");
const stockOutSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
    },
    displayQuantity: {
        type: Number,
        required: true,
    },
    unit: {
        type: String,
    },
    quantity: {
        type: Number,
        required: true,
    },
});
const StockInSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    residue: {
        type: Number,
        required: true,
    },
    itemID: {
        type: Number,
        required: true,
    },
    stockOut: {
        type: [stockOutSchema],
        default: [],
    },
});
exports.mongoStockInModel = (0, mongoose_1.model)("stock-ins", StockInSchema);
