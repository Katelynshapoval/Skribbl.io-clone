import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import Chat from "../components/Chat";
import DrawingBoard from "../components/DrawingBoard";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import RoomInfo from "../components/RoomInfo";
import "../css/pages/room.css";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { useError } from "../context/ErrorContext";

function Room() {
  // Hooks
  const location = useLocation();
  const socket = useSocket();
  const navigate = useNavigate();
  const { showError } = useError();

  // References
  const boardRef = useRef();

  // User information
  const storedUsername = sessionStorage.getItem("username");
  const storedRoomCode = sessionStorage.getItem("roomCode");

  // Determine username and room code
  const username = storedUsername || location.state?.username || "Guest";
  const roomCode = storedRoomCode || useParams().roomCode;

  // Game
  const [users, setUsers] = useState([]);
  const [userToPaint, setUserToPaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);

  // Word input and guessing states
  const [wordInputVisible, setWordInputVisible] = useState(false);
  const [wordGuessVisible, setWordGuessVisible] = useState(false);
  const [submittedWord, setSubmittedWord] = useState("");
  const [submittedGuess, setSubmittedGuess] = useState("");

  // Icons depending on message priority
  const priorityIcons = {
    low: <IoIosInformationCircleOutline />,
    medium: <IoIosCheckmarkCircleOutline />,
    high: <AiOutlineExclamationCircle />,
  };

  // Helper to add a message with auto-remove
  const addMessage = (text, priority) => {
    const id = Date.now() + Math.random(); // ensure unique id
    setMessages((prev) => {
      // Add the new message to the prev ones
      const updated = [{ id, text, priority }, ...prev];

      // keep only the last 3 messages
      return updated.slice(0, 3);
    });

    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 5000);
  };

  // Helper to pass to the roominfo component
  const leaveRoom = () => {
    if (!socket) return;
    socket.emit("leaveRoom", { roomCode, username }, () => {
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("roomCode");
      navigate("/"); // client-side navigation
    });
  };

  // Helper to check if there are more than one player in the room
  const playersExist = () => {
    if (users.length == 0) {
      showError("You need at least two players to start the game!");
      return false;
    }
    return true;
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
      addMessage(message, "medium");
    };

    const handleUserLeft = ({ message, users }) => {
      console.log("User left:", message);
      setUsers(users || []); // ensure users is always an array
      addMessage(message, "medium");
    };

    const handleReadyStatus = ({ username, ready }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.username === username ? { ...user, status: ready } : user,
        ),
      );
    };

    const handleAllReady = ({ message, userToStart }) => {
      addMessage(message, "medium");
      if (playersExist()) return;
      setUserToPaint(userToStart);
      if (userToStart === username) {
        setWordInputVisible(true);
      }
    };

    const handleRotateDrawer = ({ newDrawer }) => {
      if (playersExist()) return;
      setUserToPaint(newDrawer);
      setWordGuessVisible(newDrawer !== username);
      setWordInputVisible(newDrawer === username);
    };

    const handleWordAccepted = ({ word }) => {
      addMessage(`Word accepted: ${word}`, "medium");
      setWordInputVisible(false);
    };

    const handleWordSubmitted = ({ username }) => {
      addMessage(`${username} has submitted a word. Start guessing!`, "high");
      setUserToPaint(username);
      setWordGuessVisible(true);
    };

    const handleUserGuessedCorrectly = ({ username, word }) => {
      addMessage(
        `${username} guessed the word correctly! The word was: ${word}`,
        "high",
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
      if (correct) {
        addMessage(
          correct ? "Correct guess!" : "Incorrect guess. Try again!",
          "medium",
        );
      } else {
        addMessage("Incorrect guess. Try again!", "high");
      }
    });

    socket.on("userGuessedCorrectly", handleUserGuessedCorrectly);

    // Drawer sees guesses
    socket.on("newGuess", ({ username, guess }) => {
      addMessage(`${username} guessed: ${guess}`, "low");
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
    <div className="roomContainer">
      {/* Short room description */}
      <div className="intro">
        <h1>Welcome to the Room, {username}!</h1>
        <p>
          Room Code: <span>{roomCode || "Not provided"}</span>
        </p>
        <p>
          Drawer:{" "}
          <span>
            {userToPaint ? (
              <strong>{userToPaint}</strong>
            ) : (
              "Waiting for drawer..."
            )}
          </span>
        </p>
      </div>

      <div className="main">
        <div className="col1">
          {/* All the incoming notifications */}
          <div className="notifications card">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className={`notification ${msg.priority}`}>
                  {priorityIcons[msg.priority]}
                  {msg.text}
                </div>
              ))
            ) : (
              <p>No notifications yet</p>
            )}
          </div>
          {/* Card for the drawer to enter the correct answer */}
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
          {/* Card for the guessers */}
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
          {/* Drawing board */}
          <DrawingBoard
            ref={boardRef}
            username={username}
            userToPaint={userToPaint}
          />
        </div>
        <div className="col2">
          {/* All the info about the room */}
          <RoomInfo
            roomCode={roomCode}
            username={username}
            users={users}
            ready={ready}
            onReady={() => {
              setReady(true);
              sendReadyStatus(true);
              leaveRoom = { leaveRoom };
            }}
          />
          {/* Chat card */}
          <Chat username={username} />
        </div>
      </div>
    </div>
  );
}

export default Room;
