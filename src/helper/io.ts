import { Server } from "socket.io";
import http from "http";

let io: Server | null = null;

export function initIO(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: "*",
    },
  });
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}
