import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import Chat from "../components/Chat";
import DrawingBoard from "../components/DrawingBoard";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";

function Room() {
  // Hooks
  const location = useLocation();
  const socket = useSocket();
  const navigate = useNavigate();

  // User information
  const storedUsername = sessionStorage.getItem("username");
  const storedRoomCode = sessionStorage.getItem("roomCode");

  // Determine username and room code
  const username = storedUsername || location.state?.username || "Guest";
  const roomCode = storedRoomCode || useParams().roomCode;

  const [users, setUsers] = useState([]);
  const [userToPaint, setUserToPaint] = useState(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  // Word input and guessing states
  const [wordInputVisible, setWordInputVisible] = useState(false);
  const [wordGuessVisible, setWordGuessVisible] = useState(false);
  const [submittedWord, setSubmittedWord] = useState("");
  const [submittedGuess, setSubmittedGuess] = useState("");

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Auto rejoin after refresh
    const storedUsername = sessionStorage.getItem("username");
    const storedRoomCode = sessionStorage.getItem("roomCode");

    if (storedUsername && storedRoomCode) {
      socket.emit("joinRoom", {
        username: storedUsername,
        roomCode: storedRoomCode,
      });
    } else {
      navigate("/"); // redirect if no session
      return;
    }

    // Socket event listeners
    const handleRoomJoined = ({ users }) => {
      setUsers(users); // overwrite full list
    };

    const handleUserJoined = ({ message, users }) => {
      setUsers(users); // overwrite full list
      setMessage(message);
      setTimeout(() => setMessage(""), 5000);
    };

    const handleUserLeft = ({ message, users }) => {
      setUsers(users); // overwrite full list
      setMessage(message);
      setTimeout(() => setMessage(""), 5000);
    };

    const handleReadyStatus = ({ username, ready }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.username === username ? { ...user, status: ready } : user
        )
      );
    };

    const handleAllReady = ({ message, userToStart }) => {
      setMessage(message);
      setUserToPaint(userToStart);
      if (userToStart === username) {
        setWordInputVisible(true);
      }
      setTimeout(() => setMessage(""), 5000);
    };

    const handleWordAccepted = ({ word }) => {
      setMessage(`Word accepted: ${word}`);
      setWordInputVisible(false);
      setTimeout(() => setMessage(""), 5000);
    };

    const handleWordSubmitted = ({ username }) => {
      setMessage(`${username} has submitted a word. Start guessing!`);
      setUserToPaint(username);
      setTimeout(() => setMessage(""), 5000);
      setWordGuessVisible(true);
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("userJoinedMessage", handleUserJoined);
    socket.on("userLeftMessage", handleUserLeft);
    socket.on("readyStatus", handleReadyStatus);
    socket.on("allReady", handleAllReady);
    socket.on("wordAccepted", handleWordAccepted);
    socket.on("wordSubmitted", handleWordSubmitted);
    socket.on("guessResult", ({ correct }) => {
      if (correct) {
        setMessage("Correct guess!");
      } else {
        setMessage("Incorrect guess. Try again!");
      }
      setTimeout(() => setMessage(""), 5000);
    });
    socket.on("userGuessedCorrectly", ({ username, word }) => {
      setMessage(
        `${username} guessed the word correctly! The word was: ${word}`
      );
      setTimeout(() => setMessage(""), 5000);
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("userJoinedMessage", handleUserJoined);
      socket.off("userLeftMessage", handleUserLeft);
      socket.off("readyStatus", handleReadyStatus);
      socket.off("allReady", handleAllReady);
      socket.off("wordAccepted", handleWordAccepted);
    };
  }, [socket, navigate]);

  const sendReadyStatus = (status) => {
    if (!socket) return;
    socket.emit("sendReadyStatus", { username, ready: status });
  };

  const submitWord = () => {
    setWordInputVisible(false);
    socket.emit("submitWord", { word: submittedWord, roomCode, username });
    setSubmittedWord("");
  };

  const submitGuess = () => {
    socket.emit("submitGuess", { guess: submittedGuess, roomCode, username });
    setSubmittedGuess("");
  };

  return (
    <div>
      <h1>Welcome to the Room, {username}!</h1>
      <p>Room Code: {roomCode || "Not provided"}</p>
      <p>
        Drawer:{" "}
        {userToPaint ? <strong>{userToPaint}</strong> : "Waiting for drawer..."}
      </p>

      {message && <div className="notification">{message}</div>}
      {wordInputVisible && userToPaint === username && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitWord();
          }}
        >
          <h3>You are the drawer! Please submit a word to draw:</h3>
          <input
            type="text"
            placeholder="Enter a word"
            value={submittedWord}
            onChange={(e) => setSubmittedWord(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      )}
      {wordGuessVisible && userToPaint !== username && (
        <div className="wordGuess">
          <h3>Guess the word being drawn by {userToPaint}!</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitGuess();
            }}
          >
            <input
              type="text"
              placeholder="Enter your guess here"
              value={submittedGuess}
              onChange={(e) => setSubmittedGuess(e.target.value)}
            />
            <button type="submit">Submit Guess</button>
          </form>
        </div>
      )}

      <div className="roomInfo">
        <h2>Room Information</h2>
        <p>Room Code: {roomCode}</p>
        <p>Username: {username}</p>
        <p>Users:</p>
        <ul>
          {users.map((user, index) => (
            <li key={index}>
              {user.username} {user.username === username && "(You)"} -{" "}
              {user.status ? "Ready" : "Not Ready"}
            </li>
          ))}
        </ul>
      </div>
      <Chat username={username} />
      <DrawingBoard username={username} userToPaint={userToPaint} />
      <div>
        {!ready ? (
          <button
            onClick={() => {
              setReady(true);
              sendReadyStatus(true);
            }}
          >
            Ready
          </button>
        ) : (
          ""
        )}
        <button
          onClick={() => {
            if (!socket) return;
            socket.emit("leaveRoom", { roomCode, username }, () => {
              sessionStorage.removeItem("username");
              sessionStorage.removeItem("roomCode");
              navigate("/"); // client-side navigation
            });
          }}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

export default Room;
