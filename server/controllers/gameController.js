const {
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
} = require("../handlers/rooms");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle joining, creating, and leaving rooms
    handleJoinRoom(socket);
    handleCreateRoom(socket);
    handleLeaveRoom(socket);
    handleReadyStatus(socket, io);

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("drawing", (data) => {
      socket.broadcast.emit("drawing", data);
    });
  });
};
