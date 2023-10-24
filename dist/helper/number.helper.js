"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function roman(number) {
    let day = "";
    if (number <= 12 && number > 0) {
        switch (number) {
            case 0:
                day = "I";
                break;
            case 1:
                day = "II";
                break;
            case 2:
                day = "III";
                break;
            case 3:
                day = "IV";
                break;
            case 4:
                day = "V";
                break;
            case 5:
                day = "VI";
                break;
            case 6:
                day = "VII";
                break;
            case 7:
                day = "VIII";
                break;
            case 8:
                day = "IX";
                break;
            case 9:
                day = "X";
                break;
            case 10:
                day = "XI";
                break;
            case 11:
                day = "XII";
                break;
            default:
                break;
        }
    }
    return day;
}
exports.default = roman;
//# sourceMappingURL=number.helper.js.map