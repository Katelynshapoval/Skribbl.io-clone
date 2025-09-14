// Structure of activeRooms:
// {
//   roomCode1: {
//     word: null,
//     round: 1,
//     currentDrawer: null,
//     players: new Map([[username, { username, status: false }]]),
//   },
//   ...
// }
const activeRooms = new Map();

function handleJoinRoom(socket) {
  socket.on("joinRoom", ({ roomCode, username }) => {
    // Basic validation
    if (!roomCode || !username) return;

    // Attach user info to the socket for easy access later
    socket.username = username;
    socket.roomCode = roomCode;

    // Create the room if it doesn't exist
    const room = activeRooms.get(roomCode);
    if (room) {
      room.players.set(username, { username, status: false });
    }

    console.log(activeRooms, "activeRooms");

    // Join the socket.io room
    socket.join(roomCode);

    // Notify the user that they have joined
    socket.emit("roomJoined", {
      roomCode,
      username,
      users: Array.from(room.players.values()),
    });

    // Notify other users in the room
    socket.to(roomCode).emit("userJoinedMessage", {
      message: `${username} has joined the room.`,
      users: Array.from(room.players.values()),
    });
  });
}

function handleCreateRoom(socket) {
  socket.on("createRoom", ({ username }) => {
    // Generate a simple room code (in a real app, ensure uniqueness)
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // User info
    socket.username = username;
    socket.roomCode = roomCode;

    // Create the room and add the creator as the first player
    activeRooms.set(roomCode, {
      word: null,
      round: 1,
      currentDrawer: null,
      players: new Map([[username, { username, status: false }]]),
    });

    socket.join(roomCode);

    socket.emit("roomCreated", {
      roomCode,
      users: Array.from(activeRooms.get(roomCode).players.values()),
    });
  });
}

function handleLeaveRoom(socket, io) {
  socket.on("leaveRoom", ({ username, roomCode }, callback) => {
    if (!roomCode || !username) return;
    removeUserFromRoom(roomCode, username, socket, io);
    if (callback) callback();
  });

  socket.on("disconnect", () => {
    const { roomCode, username } = socket;
    if (!roomCode || !username) return;
    removeUserFromRoom(roomCode, username, socket, io);
  });
}

// Helper to remove user from room and notify others
function removeUserFromRoom(roomCode, username, socket, io) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  // Remove the user
  room.players.delete(username);

  // Delete room if empty
  if (room.players.size === 0) {
    activeRooms.delete(roomCode);
  }

  // Leave the socket.io room
  socket.leave(roomCode);

  // Notify others
  io.in(roomCode).emit("userLeftMessage", {
    message: `${username} has left the room.`,
    users: Array.from(room?.players.values() || []),
  });
}

function handleReadyStatus(socket, io) {
  socket.on("sendReadyStatus", ({ username, ready }) => {
    console.log(`Received ready status from ${username}: ${ready}`);

    const room = activeRooms.get(socket.roomCode);
    if (!room) return;

    // Update the player's ready status
    const player = room.players.get(username);
    if (player) {
      player.status = ready;
    }

    // Broadcast to everyone in the room (including the sender)
    io.in(socket.roomCode).emit("readyStatus", {
      username,
      ready,
    });

    // Check if ALL players are ready
    for (const user of room.players.values()) {
      if (user.status === false) {
        return; // someone not ready yet → stop here
      }
    }

    // If all are ready, pick a random starter
    const playersArray = Array.from(room.players.values());
    const starter =
      playersArray[Math.floor(Math.random() * playersArray.length)];
    room.currentDrawer = starter.username;

    io.in(socket.roomCode).emit("allReady", {
      message: "All users are ready!",
      userToStart: starter.username,
    });

    console.log(
      `All users in room ${socket.roomCode} are ready. Starting the game with ${starter.username}.`
    );
  });
}

module.exports = {
  activeRooms,
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
};

// To rotate
// const playerKeys = Array.from(room.players.keys());
// let idx = playerKeys.indexOf(room.currentDrawer);
// idx = (idx + 1) % playerKeys.length; // next player in circle
// room.currentDrawer = playerKeys[idx];
