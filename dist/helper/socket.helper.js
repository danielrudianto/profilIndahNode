"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_connection_helper_1 = require("./socket.connection.helper");
class SocketHelper {
    constructor(event_name, event_data = null) {
        this.event_data = event_data;
        this.event_name = event_name;
    }
    create() {
        socket_connection_helper_1.io.emit(this.event_name, this.event_data);
    }
}
exports.default = SocketHelper;
