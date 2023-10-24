"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
class SocketHelper {
    constructor(event_name, event_data = null) {
        this.event_data = event_data;
        this.event_name = event_name;
    }
    create() {
        app_1.io.emit(this.event_name, this.event_data);
    }
}
exports.default = SocketHelper;
//# sourceMappingURL=socket.helper.js.map