const { activeRooms } = require("../handlers/rooms.js");

function handleSubmitWord(socket) {
  socket.on("submitWord", ({ word, roomCode, username }) => {
    if (!roomCode || !username) return;

    const room = activeRooms.get(roomCode);
    if (!room) return;

    // Store the current word for the room
    room.word = word;

    // Save the drawing player's socket id
    room.drawingPlayerSocketId = socket.id;

    // Notify the drawer that their word was accepted
    socket.emit("wordAccepted", { word });

    // Notify all users in the room about the submitted word
    socket.to(roomCode).emit("wordSubmitted", {
      username,
    });
  });
}

function handleSubmitGuess(socket, io) {
  socket.on("submitGuess", ({ guess, roomCode, username }) => {
    if (!roomCode || !username) return;

    const room = activeRooms.get(roomCode);
    if (!room) return;

    // Check if the guess is correct
    const correctWord = room.word;
    if (guess === correctWord) {
      socket.emit("guessResult", { correct: true });
      io.to(roomCode).emit("userGuessedCorrectly", {
        username,
        word: correctWord,
      });
      setTimeout(() => {
        rotateDrawerBackend(roomCode, io);
      }, 3000);
    } else {
      socket.emit("guessResult", { correct: false });

      // Notify the drawing player about the new guess
      if (room.drawingPlayerSocketId) {
        socket.to(room.drawingPlayerSocketId).emit("newGuess", {
          username,
          guess,
        });
      }
    }
  });
}

function rotateDrawerBackend(roomCode, io) {
  const room = activeRooms.get(roomCode);
  if (!room || !room.players || room.players.size === 0) return;
  const playersArray = [...room.players.values()];
  const currentDrawer = room.currentDrawer;

  const currentIndex = playersArray.findIndex(
    (p) => p.username === currentDrawer,
  );

  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % playersArray.length;

  room.currentDrawer = playersArray[nextIndex].username;
  room.word = null;

  io.to(roomCode).emit("drawerChanged", {
    newDrawer: room.currentDrawer,
  });
}

module.exports = {
  handleSubmitWord,
  handleSubmitGuess,
  // handleRotateDrawer,
};
