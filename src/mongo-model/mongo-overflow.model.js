"use strict";
exports.__esModule = true;
exports.mongoOverflowModel = exports.overflowSchema = void 0;
var mongoose_1 = require("mongoose");
exports.overflowSchema = new mongoose_1.Schema({
    itemID: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
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
    value: {
        type: Number,
        required: true,
        "default": 0
    }
});
exports.mongoOverflowModel = (0, mongoose_1.model)("overflows", exports.overflowSchema);
