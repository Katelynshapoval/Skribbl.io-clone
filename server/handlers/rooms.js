// Structure of activeRooms:
// {
//   roomCode1: {
//     word: null,
//     round: 1,
//     currentDrawer: null,
//     players: new Map([[username, { username, status: false }]]),
//     backup: new Map([]),
//   },
//   ...
// }
const activeRooms = new Map();

// Joining
function handleJoinRoom(socket) {
  socket.on("joinRoom", ({ roomCode, username, playerId }) => {
    // Basic validation
    if (!roomCode || !username) return;

    // Get room
    let room = activeRooms.get(roomCode);
    if (!room) {
      return socket.emit("errorMessage", { message: "Room not found." });
    }

    // If the room was in the process of being deleted, stop it
    if (room.deleteTimeout) {
      clearTimeout(room.deleteTimeout);
      room.deleteTimeout = null;
    }

    // Duplicate username protection
    const usernameTaken = [...room.players.entries()].some(
      ([id, player]) => player.username === username && id !== playerId,
    );

    if (usernameTaken) {
      return socket.emit("errorMessage", {
        message: "Username already taken.",
      });
    }

    socket.join(roomCode);

    let assignedPlayerId = playerId;

    if (playerId && room.players.has(playerId)) {
      // Try to restore existing player
      const existingPlayer = room.players.get(playerId);
      console.log("got here");

      if (existingPlayer) {
        existingPlayer.playerId = playerId;
        existingPlayer.connected = true;
        clearTimeout(existingPlayer.disconnectTimer);

        socket.emit("roomRejoined", {
          playerId,
          roomCode: socket.roomCode,
          users: getPublicUsers(room),
          status: existingPlayer.status,
          currentDrawer: room.currentDrawer,
        });
      }
    } else {
      // Create a new player
      assignedPlayerId = crypto.randomUUID();
      room.players.set(assignedPlayerId, {
        username,
        status: false,
        socketId: socket.id,
        connected: true,
        disconnectTimer: null,
      });
      // Only notify other users
      socket.to(roomCode).emit("userJoinedMessage", {
        message: `${username} has joined the room.`,
        users: getPublicUsers(room),
      });
    }

    // Attach user info to the socket for easy access later
    socket.username = username;
    socket.roomCode = roomCode;
    socket.playerId = assignedPlayerId;

    // Always notify the joining user
    socket.emit("roomJoined", {
      roomCode,
      users: getPublicUsers(room),
      playerId: assignedPlayerId,
    });

    console.log("playerId assigned:", assignedPlayerId);
  });
}

// Get users without the timeout
function getPublicUsers(room) {
  return Array.from(room.players.entries()).map(([playerId, player]) => ({
    playerId,
    username: player.username,
    status: player.status,
    connected: player.connected,
  }));
}

// Creating
function handleCreateRoom(socket) {
  socket.on("createRoom", ({ username, roomCodeUser }) => {
    if (!username) return;

    // If no roomcode was provided generate one
    let roomCode = roomCodeUser || undefined;
    while (!roomCode) {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const playerId = crypto.randomUUID();

    // Creating the room
    const room = {
      word: null,
      round: 1,
      currentDrawer: null,
      players: new Map([
        [
          playerId,
          {
            username,
            status: false,
            socketId: socket.id,
            connected: true,
            disconnectTimer: null,
          },
        ],
      ]),
      backup: new Map([]),
    };
    activeRooms.set(roomCode, room);

    // Attach socket info
    socket.username = username;
    socket.roomCode = roomCode;
    socket.playerId = playerId;
    socket.join(roomCode);

    // Emit roomCreated (for frontend to navigate)
    socket.emit("roomCreated", {
      roomCode,
      users: getPublicUsers(room),
      playerId: playerId,
    });
  });
}

// Leaving
function handleLeaveRoom(socket, io) {
  socket.on("leaveRoom", ({ playerId, roomCode }) => {
    if (!roomCode || !playerId) return;

    permanentlyRemovePlayer(roomCode, playerId, io);

    // Clear socket info
    socket.playerId = null;
    socket.roomCode = null;
    socket.username = null;
  });

  socket.on("disconnect", () => {
    const { roomCode, playerId } = socket;
    if (!roomCode || !playerId) return;

    markPlayerDisconnected(roomCode, playerId, io);
  });
}

// Disconnect
function markPlayerDisconnected(roomCode, playerId, io) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  player.connected = false;

  player.disconnectTimer = setTimeout(() => {
    permanentlyRemovePlayer(roomCode, playerId, io);
  }, 5000);
}

// Delete permanently
function permanentlyRemovePlayer(roomCode, playerId, io) {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  room.players.delete(playerId);

  io.in(roomCode).emit("userLeftMessage", {
    message: `${player.username} has left the room.`,
    users: getPublicUsers(room),
  });

  // Delete room if empty
  if (room.players.size === 0) {
    setTimeout(() => {
      const existing = activeRooms.get(roomCode);
      if (existing && existing.players.size === 0) {
        activeRooms.delete(roomCode);
      }
    }, 5000);
  }
}

// Ready
function handleReadyStatus(socket, io) {
  socket.on("sendReadyStatus", ({ username, ready, playerId }) => {
    console.log(`Received ready status from ${username}: ${ready}`);

    const room = activeRooms.get(socket.roomCode);
    if (!room) return;

    // Update the player's ready status
    const player = room.players.get(playerId);
    if (!player) return;
    player.status = ready;
    console.log(player, "player", playerId);

    // Broadcast to everyone in the room (including the sender)
    io.in(socket.roomCode).emit("readyStatus", {
      users: getPublicUsers(room),
    });

    // Check if ALL players are ready
    for (const user of room.players.values()) {
      if (user.status === false) {
        return; // someone not ready yet → stop here
      }
    }

    const playersArray = getPublicUsers(room);

    if (playersArray.length < 2) {
      return; // stops the game if fewer than 2 players
    }

    // If all are ready, pick a random starter
    const starter =
      playersArray[Math.floor(Math.random() * playersArray.length)];
    room.currentDrawer = starter.username;

    io.in(socket.roomCode).emit("allReady", {
      message: "All users are ready!",
      userToStart: starter.username,
    });

    console.log(
      `All users in room ${socket.roomCode} are ready. Starting the game with ${starter.username}.`,
    );
  });
}

// Prevent room id duplicates
function handleValidateRoom(socket) {
  socket.on("roomExists", (room, callback) => {
    let exists = activeRooms.has(room);
    callback(exists);
  });
}

// Send back users
function handleRequestUsers(socket) {
  socket.on("requestUsers", (roomCode, callback) => {
    const room = activeRooms.get(roomCode);

    if (!room) {
      return callback([]);
    }

    callback(getPublicUsers(room));
  });
}

module.exports = {
  activeRooms,
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
  handleValidateRoom,
  handleRequestUsers,
};
