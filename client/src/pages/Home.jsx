import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import "../css/home.css";
import Error from "../components/Error";

function Home() {
  // Input states
  const [username, setUsername] = useState("");
  const [roomCodeEnter, setRoomCodeEnter] = useState("");
  const [roomCodeCreate, setRoomCodeCreate] = useState("");
  // Error states
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  // Variables for logic
  const navigate = useNavigate();
  const socket = useSocket();

  // State for room joining
  useEffect(() => {
    if (!socket) return;

    // Join room if user is returning
    // const handleRoomJoined = ({ roomCode, users }) => {
    //   navigate(`/room/${roomCode}`, {
    //     state: { username, users, roomCode },
    //   });
    // };

    // Handle errors
    const handleError = (message) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    };

    // socket.on("roomJoined", handleRoomJoined);
    socket.on("error", handleError);

    return () => {
      // socket.off("roomJoined", handleRoomJoined);
      socket.off("error", handleError);
    };
  }, [socket, navigate, username]);

  // When user clicks on "Join room"
  const handleJoinRoom = (e) => {
    e.preventDefault();

    // If no username was introduced
    if (!username.trim()) {
      triggerError("Please enter a username before joining a room.");
      return;
    }

    setError("");

    if (roomCodeEnter.trim() && socket) {
      const cleanedCode = roomCodeEnter.trim().toUpperCase() || "";
      console.log(cleanedCode);
      // Check if room exists
      socket.emit("roomExists", cleanedCode, (roomExists) => {
        if (!roomExists) {
          triggerError("The room code is doesn't exist.");
          return;
        }
        // Join the room
        socket.emit("joinRoom", {
          roomCode: roomCodeEnter,
          username: username,
        });
        console.log("room", roomCodeEnter);
        // Save to session storage for refresh persistence
        sessionStorage.setItem("username", username);
        sessionStorage.setItem("roomCode", roomCodeEnter);
        // Clear the form
        setRoomCodeEnter("");
        navigate(`/room/${cleanedCode}`);
      });
    }
  };

  // Display the error pop-up
  const triggerError = (message) => {
    setError(message);
    setShowError(true);

    // Remove the error when the time runs out
    setTimeout(() => {
      setShowError(false);
    }, 3000);
  };

  // Create a new room
  const handleCreateRoom = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      triggerError("Please enter a username before creating a room.");
      return;
    }

    setError("");

    if (!socket) return;

    const cleanedCode = roomCodeCreate.trim().toUpperCase() || "";

    const emitCreate = (code) => {
      socket.emit("createRoom", {
        username,
        roomCodeUser: code,
      });
    };

    if (cleanedCode) {
      // Validate the custom code first
      socket.emit("roomExists", cleanedCode, (roomExists) => {
        if (roomExists) {
          triggerError("The room code is not unique.");
          return;
        }
        emitCreate(cleanedCode);
      });
    } else {
      // Let the server generate a code
      emitCreate("");
    }

    // Listen for roomCreated once and use the server-provided code
    socket.once("roomCreated", ({ roomCode, users }) => {
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("roomCodeEnter", roomCode);

      navigate(`/room/${roomCode}`, {
        state: { username, users, roomCodeEnter: roomCode },
      });
    });
  };

  return (
    <div className="homePage">
      {/* Error pop-up */}
      <Error
        className={`errorToast ${showError ? "show" : ""}`}
        message={error}
      ></Error>
      <div className="usernameInputBox">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={username}
          autoComplete="off"
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="rooms">
        <div className="joinRoomBox">
          <h2>Join a Room</h2>
          <form onSubmit={handleJoinRoom}>
            <label htmlFor="roomCodeEnter" hidden>
              Room Code:
            </label>
            <input
              type="text"
              id="roomCodeEnter"
              name="roomCodeEnter"
              placeholder="Enter room code"
              autoComplete="off"
              value={roomCodeEnter}
              minLength={6}
              maxLength={6}
              onChange={(e) => setRoomCodeEnter(e.target.value)}
              required
            />
            <button type="submit">Join Game</button>
          </form>
        </div>

        <p>Or</p>

        <div className="createRoomBox">
          <h2>Create a Room</h2>
          <form onSubmit={handleCreateRoom}>
            <label htmlFor="createRoom" hidden>
              Room Code:
            </label>
            <input
              type="text"
              id="createRoom"
              name="createRoom"
              placeholder="Enter room code (Optional)"
              autoComplete="off"
              minLength={6}
              maxLength={6}
              value={roomCodeCreate}
              onChange={(e) => setRoomCodeCreate(e.target.value)}
            />
            <button type="submit">Create Room</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Home;
