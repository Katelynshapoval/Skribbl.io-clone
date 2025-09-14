const { activeRooms } = require("../handlers/rooms.js");

function handleSubmitWord(socket) {
  socket.on("submitWord", ({ word, roomCode, username }) => {
    if (!roomCode || !username) return;

    // Store the current word for the room
    activeRooms.get(roomCode).word = word;

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

    // Check if the guess is correct
    const correctWord = activeRooms.get(roomCode).word;
    if (guess === correctWord) {
      socket.emit("guessResult", { correct: true });
      socket.to(roomCode).emit("userGuessedCorrectly", { username });
    } else {
      socket.emit("guessResult", { correct: false });
    }
  });
}

module.exports = {
  handleSubmitWord,
  handleSubmitGuess,
};
