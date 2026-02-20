const {
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
  handleValidateRoom,
} = require("../handlers/rooms");

const {
  handleSubmitWord,
  handleSubmitGuess,
  handleRotateDrawer,
} = require("../handlers/gameLogic");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("hi");

    // Handle joining, creating, and leaving rooms
    handleJoinRoom(socket);
    handleCreateRoom(socket);
    handleLeaveRoom(socket, io);
    handleReadyStatus(socket, io);
    handleValidateRoom(socket);

    // Game logic handlers
    handleSubmitWord(socket);
    handleSubmitGuess(socket, io);
    // handleRotateDrawer(socket, io);

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("drawing", (data) => {
      socket.broadcast.emit("drawing", data);
    });
  });
};
