const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For development only, restrict in prod
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinGame", ({ username }) => {
    console.log(`User joined game with username: ${username}`);

    // You could save the username to socket object for later use
    socket.username = username;

    // Send back a welcome message
    socket.emit("welcome", `Welcome to the game, ${username}!`);
  });
  socket.on("sendMessage", (message) => {
    // Broadcast to all clients including sender
    io.emit("receiveMessage", message);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
