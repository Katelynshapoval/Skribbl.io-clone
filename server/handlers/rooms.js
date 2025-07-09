const activeRooms = {};

function handleJoinRoom(socket) {
  socket.on("joinRoom", ({ roomCode, username }) => {
    socket.username = username;
    socket.roomCode = roomCode;
    console.log(socket.username, "username");
    if (activeRooms[roomCode]) {
      activeRooms[roomCode].add(username);
      socket.join(roomCode);
      socket.emit("roomJoined", {
        roomCode,
        username,
        users: Array.from(activeRooms[roomCode]),
      });
      socket.to(roomCode).emit("userJoinedMessage", {
        message: `${username} has joined the room.`,
        users: Array.from(activeRooms[roomCode]),
      });
      console.log(activeRooms[roomCode], "users");
      console.log(`User ${username} joined room: ${roomCode}`);
    } else {
      socket.emit("error", "Room does not exist");
      console.error(
        `User ${username} tried to join non-existent room: ${roomCode}`
      );
    }
  });
}

function handleCreateRoom(socket) {
  socket.on("createRoom", ({ username }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    socket.username = username;
    socket.roomCode = roomCode;

    activeRooms[roomCode] = new Set([username]);
    socket.join(roomCode);
    socket.emit("roomCreated", {
      roomCode,
      users: Array.from(activeRooms[roomCode]),
    });
    console.log(`Room created with code: ${roomCode}`);
  });
}

function handleLeaveRoom(socket) {
  socket.on("disconnect", () => {
    const { roomCode, username } = socket;
    console.log(`User ${username} disconnected from room: ${roomCode}`);
    if (activeRooms[roomCode]) {
      activeRooms[roomCode].delete(username);
      if (activeRooms[roomCode].size === 0) {
        delete activeRooms[roomCode];
        console.log(`Room ${roomCode} deleted as it is now empty.`);
      }
      socket.leave(roomCode);
      socket.to(roomCode).emit("userLeftMessage", {
        message: `${username} has left the room.`,
        users: activeRooms[roomCode] ? Array.from(activeRooms[roomCode]) : [],
      });
      console.log(`User ${username} left room: ${roomCode}`);
    } else {
      console.error(
        `User ${username} tried to leave non-existent room: ${roomCode}`
      );
    }
  });
}

module.exports = {
  activeRooms,
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
};
