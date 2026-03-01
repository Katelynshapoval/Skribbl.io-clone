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
  socket.on("joinRoom", ({ roomCode, username }) => {
    // Basic validation
    if (!roomCode || !username) return;

    // Attach user info to the socket for easy access later
    socket.username = username;
    socket.roomCode = roomCode;

    // Get room number
    let room = activeRooms.get(roomCode);

    // If the room was in the process of being deleted, stop it
    if (room.deleteTimeout) {
      clearTimeout(room.deleteTimeout);
      room.deleteTimeout = null;
    }

    // Checker
    const usernameTaken = [...room.players.values()].some(
      (player) => player.username === username,
    );

    // Make sure there're no duplicates
    if (usernameTaken) {
      return socket.emit("errorMessage", {
        message: "Username already taken.",
      });
    }

    // Join the socket.io room
    socket.join(roomCode);

    // Try to restore user from backup (if it exists) and if not, simply create a user
    if (!tryRestoreFromBackup(room, socket, username)) {
      // Add this user to the room
      room.players.set(socket.id, { username, status: false });
    }

    // Only notify other users if this is a new join (not a refresh/reconnect)
    socket.to(roomCode).emit("userJoinedMessage", {
      message: `${username} has joined the room.`,
      users: Array.from(room.players.values()),
    });
    // Always notify the user that they have joined (or rejoined)
    socket.emit("roomJoined", {
      roomCode,
      users: Array.from(room.players.values()),
    });
  });
}

// Creating
function handleCreateRoom(socket) {
  socket.on("createRoom", ({ username, roomCodeUser }) => {
    if (!username) return;

    let roomCode = roomCodeUser || undefined;
    while (!roomCode || activeRooms.has(roomCode)) {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const room = {
      word: null,
      round: 1,
      currentDrawer: null,
      players: new Map([[socket.id, { username, status: false }]]),
      backup: new Map([]),
    };
    activeRooms.set(roomCode, room);

    // Attach socket info
    socket.username = username;
    socket.roomCode = roomCode;
    socket.join(roomCode);

    // Emit roomCreated (for frontend to navigate)
    socket.emit("roomCreated", {
      roomCode,
      users: Array.from(room.players.values()),
    });

    console.log(`${username} created room: ${roomCode}`);
  });
}

// Leaving
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

  // Start 5 second deletion timer
  const timeout = setTimeout(() => {
    room.backup.delete(username);
    console.log(`${username} permanently removed from backup.`);
  }, 5000);

  // Save to backup
  const curStatus = room.players.get(socket.id)?.status;
  room.backup.set(username, {
    username,
    status: curStatus,
    timeout,
  });

  // Remove the user
  room.players.delete(socket.id);

  // Delete room if empty
  if (room.players.size === 0) {
    room.deleteTimeout = setTimeout(() => {
      // Double check nobody rejoined
      const existingRoom = activeRooms.get(roomCode);
      if (existingRoom && existingRoom.players.size === 0) {
        activeRooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted due to inactivity.`);
      }
    }, 5000); // 5 second grace period
  }

  // Leave the socket.io room
  socket.leave(roomCode);

  // Notify others
  io.in(roomCode).emit("userLeftMessage", {
    message: `${username} has left the room.`,
    users: Array.from(room?.players.values() || []),
  });
}

// Ready
function handleReadyStatus(socket, io) {
  socket.on("sendReadyStatus", ({ username, ready }) => {
    console.log(`Received ready status from ${username}: ${ready}`);

    const room = activeRooms.get(socket.roomCode);
    if (!room) return;

    // Update the player's ready status
    const player = room.players.get(socket.id);
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

    const playersArray = Array.from(room.players.values());

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

// Validate
function handleValidateRoom(socket) {
  socket.on("roomExists", (room, callback) => {
    let exists = activeRooms.has(room);
    console.log(activeRooms, room, "huh");
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

    callback([...room.players.values()]);
  });
}

// For refreshing the page
function tryRestoreFromBackup(room, socket, username) {
  if (!room.backup.has(username)) return false;
  console.log("backup");

  const backupUser = room.backup.get(username);

  console.log(room.backup, "backup");

  // Cancel deletion timer
  clearTimeout(backupUser.timeout);

  // Remove from backup
  room.backup.delete(username);

  // Add back to active players with new socket.id
  room.players.set(socket.id, {
    username,
    status: backupUser.status,
  });

  socket.join(socket.roomCode);

  socket.emit("roomRejoined", {
    roomCode: socket.roomCode,
    users: Array.from(room.players.values()),
    status: backupUser.status,
    currentDrawer: room.currentDrawer,
  });

  console.log(
    "ooh",
    socket.roomCode,
    Array.from(room.players.values()),
    backupUser.status,
    room.currentDrawer,
  );

  console.log(`${username} successfully reconnected.`);

  return true;
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

// // Check if user exists in backup (reconnecting)
// if (room.backup.has(username)) {
//   const backupUser = room.backup.get(username);

//   // Cancel deletion timer
//   clearTimeout(backupUser.timeout);

//   // Remove from backup
//   room.backup.delete(username);

//   // Add back to active players with new socket.id
//   room.players.set(socket.id, {
//     username,
//     status: backupUser.status,
//   });

//   socket.join(roomCode);

//   socket.emit("roomJoined", {
//     roomCode,
//     users: Array.from(room.players.values()),
//   });

//   console.log(`${username} successfully reconnected.`);
//   return;
// }
