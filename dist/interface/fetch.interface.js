"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchType = exports.fetchMode = void 0;
var fetchMode;
(function (fetchMode) {
    fetchMode[fetchMode["All"] = 0] = "All";
    fetchMode[fetchMode["Pagination"] = 1] = "Pagination";
    fetchMode[fetchMode["Autocomplete"] = 2] = "Autocomplete";
    fetchMode[fetchMode["Child"] = 3] = "Child";
    fetchMode[fetchMode["ParentAutocomplete"] = 4] = "ParentAutocomplete";
    fetchMode[fetchMode["ChildAutocomplete"] = 5] = "ChildAutocomplete";
    fetchMode[fetchMode["Unconfirmed"] = 6] = "Unconfirmed";
})(fetchMode = exports.fetchMode || (exports.fetchMode = {}));
var fetchType;
(function (fetchType) {
    fetchType[fetchType["Complete"] = 0] = "Complete";
    fetchType[fetchType["Simple"] = 1] = "Simple";
})(fetchType = exports.fetchType || (exports.fetchType = {}));
//# sourceMappingURL=fetch.interface.js.map