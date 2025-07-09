const {
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
} = require("../handlers/rooms");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle joining, creating, and leaving rooms
    handleJoinRoom(socket);
    handleCreateRoom(socket);
    handleLeaveRoom(socket);

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("drawing", (data) => {
      socket.broadcast.emit("drawing", data);
    });
  });
};
