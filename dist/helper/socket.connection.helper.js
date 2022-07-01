"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = void 0;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("../app"));
exports.server = http_1.default.createServer(app_1.default);
exports.io = new socket_io_1.Server(exports.server, {
    cors: {
        origin: "https://app.profilindah.id",
        methods: ["GET", "POST"],
    },
});
exports.io.on("connection", (socket) => {
    console.log("A user has connected.");
});
