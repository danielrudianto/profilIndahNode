"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoProductModel = void 0;
const mongoose_1 = require("mongoose");
const productSchema = new mongoose_1.Schema({
    reference: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    itemID: {
        type: Number,
        required: true,
        unique: true,
    },
    itemTypeID: {
        type: Number,
        required: true,
    },
    itemBrandID: {
        type: Number,
        required: true,
    },
    currentStock: {
        type: Number,
        required: true,
    },
    unit: {
        type: String,
        required: true,
    },
    minimumStock: {
        type: Number,
        default: 0,
        required: true,
    },
    calculatedMinimumStock: {
        type: Number,
        default: 0,
        required: true,
    },
});
exports.mongoProductModel = (0, mongoose_1.model)("products", productSchema);
//# sourceMappingURL=mongo-product.model.js.map