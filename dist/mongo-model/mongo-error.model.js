"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoErrorModel = exports.queueErrorSchema = void 0;
const mongoose_1 = require("mongoose");
exports.queueErrorSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
    },
    error: {
        type: String,
        required: true,
    },
    function: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        required: true,
    },
});
exports.mongoErrorModel = (0, mongoose_1.model)("queue-error", exports.queueErrorSchema);
//# sourceMappingURL=mongo-error.model.js.map