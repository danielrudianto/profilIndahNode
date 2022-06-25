import http from "http";
import { Server } from "socket.io";
import app from "../app";

export const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user has connected.");
});
