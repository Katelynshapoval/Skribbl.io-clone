module.exports = (io) => {
  // Listen for new client connections to the Socket.IO server
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinGame", ({ username }) => {
      console.log(`User joined game with username: ${username}`);
      socket.username = username;
      socket.emit("welcome", `Welcome to the game, ${username}!`);
    });

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
