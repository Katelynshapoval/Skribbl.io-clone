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

function handleSubmitGuess(socket) {
  socket.on("submitGuess", ({ guess, roomCode, username }) => {
    if (!roomCode || !username) return;

    const room = activeRooms.get(roomCode);
    if (!room) return;

    // Check if the guess is correct
    const correctWord = room.word;
    if (guess === correctWord) {
      socket.emit("guessResult", { correct: true });
      socket
        .to(roomCode)
        .emit("userGuessedCorrectly", { username, word: correctWord });
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

module.exports = {
  handleSubmitWord,
  handleSubmitGuess,
};
