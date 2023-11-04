"use strict";
exports.__esModule = true;
exports.mongoProductModel = void 0;
var mongoose_1 = require("mongoose");
var mongo_stock_card_model_1 = require("./mongo-stock-card.model");
var productSchema = new mongoose_1.Schema({
    reference: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    itemID: {
        type: Number,
        required: true,
        unique: true
    },
    itemTypeID: {
        type: Number,
        required: true
    },
    itemBrandID: {
        type: Number,
        required: true
    },
    currentStock: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    stockCard: {
        type: [mongo_stock_card_model_1.stockCardSchema],
        "default": []
    }
});
exports.mongoProductModel = (0, mongoose_1.model)("products", productSchema);
