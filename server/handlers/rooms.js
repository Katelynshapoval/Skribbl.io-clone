const activeRooms = {};

function handleJoinRoom(socket) {
  socket.on("joinRoom", ({ roomCode, username }) => {
    socket.username = username;
    socket.roomCode = roomCode;

    if (!activeRooms[roomCode]) {
      socket.emit("error", "Room does not exist");
      return;
    }

    activeRooms[roomCode].set(username, { username, status: false });
    socket.join(roomCode);

    socket.emit("roomJoined", {
      roomCode,
      username,
      users: Array.from(activeRooms[roomCode].values()),
    });

    socket.to(roomCode).emit("userJoinedMessage", {
      message: `${username} has joined the room.`,
      users: Array.from(activeRooms[roomCode].values()),
    });
  });
}

function handleCreateRoom(socket) {
  socket.on("createRoom", ({ username }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.username = username;
    socket.roomCode = roomCode;

    activeRooms[roomCode] = new Map();
    activeRooms[roomCode].set(username, { username, status: false });
    socket.join(roomCode);

    socket.emit("roomCreated", {
      roomCode,
      users: Array.from(activeRooms[roomCode].values()),
    });
  });
}

function handleLeaveRoom(socket) {
  socket.on("leaveRoom", ({ username, roomCode }, callback) => {
    if (!roomCode || !username) return;

    const room = activeRooms[roomCode];
    if (room) {
      room.delete(username);

      if (room.size === 0) {
        delete activeRooms[roomCode];
      }

      socket.leave(roomCode);

      // Notify remaining users in that room
      socket.to(roomCode).emit("userLeftMessage", {
        message: `${username} has left the room.`,
        users: Array.from(room?.values() || []),
      });
    }

    if (callback) callback();
  });

  socket.on("disconnect", () => {
    const { roomCode, username } = socket;
    if (!roomCode || !username) return;

    const room = activeRooms[roomCode];
    if (room) {
      room.delete(username);

      if (room.size === 0) {
        delete activeRooms[roomCode];
      }

      socket.to(roomCode).emit("userLeftMessage", {
        message: `${username} has left the room.`,
        users: Array.from(room?.values() || []),
      });
    }
  });
}

function handleReadyStatus(socket, io) {
  // Handle ready status updates
  socket.on("sendReadyStatus", ({ username, ready }) => {
    console.log(`Received ready status from ${username}: ${ready}`);
    if (activeRooms[socket.roomCode]) {
      activeRooms[socket.roomCode].forEach((user) => {
        if (user.username === username) {
          user.status = ready;
        }
      });

      // Broadcast to everyone in the room (including the sender)
      io.in(socket.roomCode).emit("readyStatus", {
        username,
        ready,
      });
    }
  });
}

module.exports = {
  activeRooms,
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
};
