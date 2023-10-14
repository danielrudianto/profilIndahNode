"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockCardSchema = void 0;
const mongoose_1 = require("mongoose");
exports.stockCardSchema = new mongoose_1.Schema({
    createdAt: {
        type: Date,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    document: {
        type: String,
        required: true,
    },
    opponent: {
        type: String,
        required: true,
    },
    displayQuantity: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    unit: {
        type: String,
        required: true,
    },
    currentStock: {
        type: Number,
        required: true,
    },
});
const mongoStockCardModel = (0, mongoose_1.model)("stock-cards", exports.stockCardSchema);
exports.default = mongoStockCardModel;
