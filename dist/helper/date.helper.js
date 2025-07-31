"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateHelper = exports.formatDate = void 0;
var formatDate;
(function (formatDate) {
    formatDate[formatDate["DDMMYYYY"] = 0] = "DDMMYYYY";
    formatDate[formatDate["YYYYMMDD"] = 1] = "YYYYMMDD";
})(formatDate = exports.formatDate || (exports.formatDate = {}));
class DateHelper {
    // convert from Date object to DD-MM-YYYY
    static convertDate(date, format) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        switch (format) {
            case formatDate.DDMMYYYY:
                return `${day.toString().padStart(2, "0")}-${(month + 1)
                    .toString()
                    .padStart(2, "0")}-${year}`;
            case formatDate.YYYYMMDD:
                return `${year}-${(month + 1).toString().padStart(2, "0")}-${day
                    .toString()
                    .padStart(2, "0")}`;
            default:
                break;
        }
    }
}
exports.DateHelper = DateHelper;
//# sourceMappingURL=date.helper.js.map