"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorList;
(function (ErrorList) {
    ErrorList["Auth error"] = "Error on authenticating. Please check your credential";
    ErrorList["Not found"] = "Data does not exist";
    ErrorList["Unknown error"] = "An error just occured. Please try again later.";
    ErrorList["Parameter error"] = "Please fill in the required fields.";
    ErrorList["Delete error"] = "Sorry, cannot delete this data. Usually because other data is depending on this one.";
    ErrorList["Duplicate error"] = "Sorry, we found a duplication on the data. Please try again with different identifier.";
    ErrorList["Product not found"] = "Product does not exist";
    ErrorList["Product unit not found"] = "Product unit does not exist";
    ErrorList["Product package not found"] = "Product package does not exist";
    ErrorList["Price is required"] = "Price is required";
    ErrorList["Package name required"] = "Package name is required";
    ErrorList["Package description required"] = "Package description is required";
    ErrorList["Package items required"] = "Package items is required";
})(ErrorList || (ErrorList = {}));
exports.default = ErrorList;
