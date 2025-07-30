"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translatePageSize = exports.translateFaktur = exports.translateSalesName = exports.translateDate = exports.translateNPWP = exports.translatePage = exports.translateKeyword = exports.mysql_real_escape_string = void 0;
function mysql_real_escape_string(string) {
    return string.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case '"':
            case "'":
            case "\\":
            case "%":
                return "\\" + char; // prepends a backslash to backslash, percent,
            // and double/single quotes
            default:
                return char;
        }
    });
}
exports.mysql_real_escape_string = mysql_real_escape_string;
function translateKeyword(keyword) {
    if (!keyword) {
        return "";
    }
    return decodeURIComponent(keyword);
}
exports.translateKeyword = translateKeyword;
function translatePage(page) {
    if (!page) {
        return 1;
    }
    const pageNumber = Number(page);
    if (isNaN(pageNumber)) {
        return 1;
    }
    if (pageNumber < 1) {
        return 1;
    }
    return Math.floor(pageNumber);
}
exports.translatePage = translatePage;
function translateNPWP(npwp) {
    if (!npwp) {
        return null;
    }
    const npwpString = npwp.toString();
    if (npwpString.length !== 15 && npwpString.length !== 16) {
        return null;
    }
    return npwpString;
}
exports.translateNPWP = translateNPWP;
function translateDate(date) {
    if (!date || date == null) {
        return new Date();
    }
    if (typeof date === "string") {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return new Date();
        }
        return parsedDate;
    }
    return date;
}
exports.translateDate = translateDate;
function translateSalesName(sales) {
    if (sales != null && sales.length > 0) {
        return sales.toUpperCase();
    }
    return null;
}
exports.translateSalesName = translateSalesName;
function translateFaktur(faktur) {
    if (!faktur || faktur == null) {
        return null;
    }
    const fakturString = faktur.toString();
    if (fakturString.length !== 16) {
        return null;
    }
    return fakturString;
}
exports.translateFaktur = translateFaktur;
function translatePageSize(pageSize) {
    if (!pageSize) {
        return 10; // Default page size
    }
    const size = Number(pageSize);
    if (isNaN(size) || size < 1 || size > 100) {
        return 10; // Default page size if invalid
    }
    return Math.floor(size);
}
exports.translatePageSize = translatePageSize;
//# sourceMappingURL=escape.helper.js.map