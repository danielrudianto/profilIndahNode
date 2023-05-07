"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
class ErrorHelper {
}
ErrorHelper.intercept = (req, res, next) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    else {
        next();
    }
};
exports.default = ErrorHelper;
