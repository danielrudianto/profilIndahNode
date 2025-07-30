"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initIO = void 0;
const socket_io_1 = require("socket.io");
let io = null;
function initIO(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: "*",
        },
    });
    return io;
}
exports.initIO = initIO;
function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}
exports.getIO = getIO;
//# sourceMappingURL=io.js.map