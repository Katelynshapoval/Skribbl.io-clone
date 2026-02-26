import React, { useState, useEffect, useRef } from "react";
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

  // References
  const boardRef = useRef();

  // User information
  const storedUsername = sessionStorage.getItem("username");
  const storedRoomCode = sessionStorage.getItem("roomCode");

  // Determine username and room code
  const username = storedUsername || location.state?.username || "Guest";
  const roomCode = storedRoomCode || useParams().roomCode;

  const [users, setUsers] = useState([]);
  const [userToPaint, setUserToPaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);

  // Word input and guessing states
  const [wordInputVisible, setWordInputVisible] = useState(false);
  const [wordGuessVisible, setWordGuessVisible] = useState(false);
  const [submittedWord, setSubmittedWord] = useState("");
  const [submittedGuess, setSubmittedGuess] = useState("");

  // Helper to add a message with auto-remove
  const addMessage = (text) => {
    const id = Date.now() + Math.random(); // ensure unique id
    setMessages((prev) => {
      // Add the new message to the prev ones
      const updated = [...prev, { id, text }];

      // keep only the last 3 messages
      return updated.slice(-3);
    });

    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 5000);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // If we have username and roomCode, emit joinRoom to get current state
    if (username && roomCode) {
      socket.emit("joinRoom", { roomCode, username });
      console.log("lox", username, roomCode);
    }

    // Socket event listeners
    const handleRoomJoined = ({ roomCode, users }) => {
      console.log("Room joined:", roomCode, users);
      setUsers(users || []); // ensure users is always an array
    };

    const handleRoomCreated = ({ roomCode, users }) => {
      console.log("Room created:", roomCode, users);
      setUsers(users || []); // ensure users is always an array
    };

    const handleUserJoined = ({ message, users }) => {
      console.log("User joined:", message);
      setUsers(users || []); // ensure users is always an array
      addMessage(message);
    };

    const handleUserLeft = ({ message, users }) => {
      console.log("User left:", message);
      setUsers(users || []); // ensure users is always an array
      addMessage(message);
    };

    const handleReadyStatus = ({ username, ready }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.username === username ? { ...user, status: ready } : user,
        ),
      );
    };

    const handleAllReady = ({ message, userToStart }) => {
      addMessage(message);
      setUserToPaint(userToStart);
      if (userToStart === username) {
        setWordInputVisible(true);
      }
    };

    const handleRotateDrawer = ({ newDrawer }) => {
      console.log("New Drawer ", newDrawer);
      setUserToPaint(newDrawer);
      setWordGuessVisible(newDrawer !== username);
      setWordInputVisible(newDrawer === username);
    };

    const handleWordAccepted = ({ word }) => {
      addMessage(`Word accepted: ${word}`);
      setWordInputVisible(false);
    };

    const handleWordSubmitted = ({ username }) => {
      addMessage(`${username} has submitted a word. Start guessing!`);
      setUserToPaint(username);
      setWordGuessVisible(true);
    };

    const handleUserGuessedCorrectly = ({ username, word }) => {
      addMessage(
        `${username} guessed the word correctly! The word was: ${word}`,
      );
      setWordGuessVisible(false);
      setUserToPaint(null);
      setWordInputVisible(false);

      // Clear the board after a short delay
      setTimeout(() => {
        boardRef.current?.clear();
      }, 3000);
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("userJoinedMessage", handleUserJoined);
    socket.on("userLeftMessage", handleUserLeft);
    socket.on("readyStatus", handleReadyStatus);
    socket.on("allReady", handleAllReady);
    socket.on("wordAccepted", handleWordAccepted);
    socket.on("wordSubmitted", handleWordSubmitted);
    socket.on("guessResult", ({ correct }) => {
      addMessage(correct ? "Correct guess!" : "Incorrect guess. Try again!");
    });

    socket.on("userGuessedCorrectly", handleUserGuessedCorrectly);

    // Drawer sees guesses
    socket.on("newGuess", ({ username, guess }) => {
      addMessage(`${username} guessed: ${guess}`);
    });

    // Rotate drawer
    socket.on("drawerChanged", handleRotateDrawer);
    socket.on("roomCreated", handleRoomCreated);

    // Cleanup listeners on unmount
    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("userJoinedMessage", handleUserJoined);
      socket.off("userLeftMessage", handleUserLeft);
      socket.off("readyStatus", handleReadyStatus);
      socket.off("allReady", handleAllReady);
      socket.off("wordAccepted", handleWordAccepted);
      socket.off("wordSubmitted", handleWordSubmitted);
      socket.off("guessResult");
      socket.off("userGuessedCorrectly", handleUserGuessedCorrectly);
      socket.off("newGuess");
      socket.off("rotateDrawer", handleRotateDrawer);
      socket.off("roomCreated", handleRoomCreated);
    };
  }, [socket, username, roomCode]); // Added username and roomCode as dependencies

  // Get users on start
  useEffect(() => {
    socket.emit("requestUsers", storedRoomCode, (users) => {
      setUsers(users);
    });
  }, [socket, storedRoomCode]);

  const sendReadyStatus = (status) => {
    if (!socket) return;
    socket.emit("sendReadyStatus", { username, ready: status });
  };

  const submitWord = () => {
    setWordInputVisible(false);
    socket.emit("submitWord", {
      word: submittedWord.toLowerCase(),
      roomCode,
      username,
    });
    setSubmittedWord("");
  };

  const submitGuess = () => {
    socket.emit("submitGuess", {
      guess: submittedGuess.toLowerCase(),
      roomCode,
      username,
    });
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

      <div className="notifications">
        {messages.map((msg) => (
          <div key={msg.id} className="notification">
            {msg.text}
          </div>
        ))}
      </div>
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
      <DrawingBoard
        ref={boardRef}
        username={username}
        userToPaint={userToPaint}
      />
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
