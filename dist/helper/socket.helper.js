"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io_1 = require("./io");
class SocketHelper {
    constructor(event_name, event_data = null) {
        this.event_data = event_data;
        this.event_name = event_name;
    }
    create() {
        (0, io_1.getIO)().emit(this.event_name, this.event_data);
    }
}
exports.default = SocketHelper;
//# sourceMappingURL=socket.helper.js.map