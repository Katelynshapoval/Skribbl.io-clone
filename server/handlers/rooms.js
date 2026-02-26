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

// Joining
function handleJoinRoom(socket) {
  socket.on("joinRoom", ({ roomCode, username }) => {
    console.log("here", roomCode, username);
    // Basic validation
    if (!roomCode || !username) return;

    // Attach user info to the socket for easy access later
    socket.username = username;
    socket.roomCode = roomCode;

    // Get room number
    let room = activeRooms.get(roomCode);

    // Check if user is already in the room (to handle refreshes/reconnections)
    const isAlreadyInRoom = room.players.has(socket.id);

    // Add this user to the room (or update if already exists)
    room.players.set(socket.id, { username, status: false });

    if (room.players.has(socket.id)) {
      return socket.emit("errorMessage", {
        message: "Username already taken.",
      });
    }

    // Join the socket.io room
    socket.join(roomCode);

    // Always notify the user that they have joined (or rejoined)
    socket.emit("roomJoined", {
      roomCode,
      users: Array.from(room.players.values()),
    });

    // Only notify other users if this is a new join (not a refresh/reconnect)
    if (!isAlreadyInRoom) {
      socket.to(roomCode).emit("userJoinedMessage", {
        message: `${username} has joined the room.`,
        users: Array.from(room.players.values()),
      });
      console.log(`${username} joined room: ${roomCode}`);
    } else {
      console.log(`${username} reconnected to room: ${roomCode}`);
    }
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

    // Emit roomJoined once, so Room component updates users
    // socket.emit("roomJoined", {
    //   roomCode,
    //   users: Array.from(room.players.values()),
    // });

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

module.exports = {
  activeRooms,
  handleJoinRoom,
  handleCreateRoom,
  handleLeaveRoom,
  handleReadyStatus,
  handleValidateRoom,
};
