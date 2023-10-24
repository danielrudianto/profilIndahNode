"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemFactory = exports.itemFactoryType = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
var itemFactoryType;
(function (itemFactoryType) {
    itemFactoryType[itemFactoryType["Reference"] = 0] = "Reference";
    itemFactoryType[itemFactoryType["References"] = 1] = "References";
    itemFactoryType[itemFactoryType["ID"] = 2] = "ID";
    itemFactoryType[itemFactoryType["IDs"] = 3] = "IDs";
    itemFactoryType[itemFactoryType["Search"] = 4] = "Search";
})(itemFactoryType = exports.itemFactoryType || (exports.itemFactoryType = {}));
class ItemFactory {
    fetch(type, data) {
        switch (type) {
            case itemFactoryType.Reference:
                if (typeof data == "string") {
                }
                throw Error(error_list_1.default["Parameter error"]);
            case itemFactoryType.References:
                // Check if data is array of string
                if (Array.isArray(data) &&
                    data.length > 0 &&
                    data.every((x) => typeof x == "string")) {
                }
                throw Error(error_list_1.default["Parameter error"]);
            case itemFactoryType.ID:
                if (typeof data == "number") {
                }
                throw Error(error_list_1.default["Parameter error"]);
            case itemFactoryType.IDs:
                if (Array.isArray(data) &&
                    data.length > 0 &&
                    data.every((x) => typeof x == "number")) {
                }
                throw Error(error_list_1.default["Parameter error"]);
            case itemFactoryType.Search:
                break;
        }
    }
}
exports.ItemFactory = ItemFactory;
//# sourceMappingURL=item.factory.js.map