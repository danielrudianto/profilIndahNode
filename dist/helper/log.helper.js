"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
class LogHelper {
    static log(date, type, event, location, done_by) {
        if (type === "error") {
            fs_1.default.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event.replace(/\n|\r|, /g, ",")}; ${location}; ${done_by}\r\n`);
        }
        else {
            fs_1.default.appendFileSync(__dirname + "/../log.csv", `${new Date(date)}; ${type}; ${event}; ${location}; ${done_by}\r\n`);
        }
    }
}
exports.default = LogHelper;
