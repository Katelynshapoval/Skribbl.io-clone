import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import "../css/pages/home.css";
import { useNotification } from "../context/NotificationsContext";

function Home() {
  // Input states
  const [username, setUsername] = useState("");
  const [roomCodeEnter, setRoomCodeEnter] = useState("");
  const [roomCodeCreate, setRoomCodeCreate] = useState("");
  // Variables for logic, contexr
  const navigate = useNavigate();
  const socket = useSocket();
  const { showNotification } = useNotification();
  // Helpers
  const cleanCode = (code) => code.trim().toUpperCase();
  const persistSession = (username, roomCode) => {
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("roomCode", roomCode);
  };

  // Errors from the server
  useEffect(() => {
    if (!socket) return;

    const handleErrorMessage = ({ message }) => {
      showNotification(message, "error");
    };
    socket.on("errorMessage", handleErrorMessage);
    return () => {
      socket.off("errorMessage", handleErrorMessage);
    };
  }, [socket]);

  // When user clicks on "Join room"
  const handleJoinRoom = (e) => {
    e.preventDefault();

    // If no username was introduced
    if (!username.trim()) {
      showNotification(
        "Please enter a username before joining a room.",
        "error",
      );
      return;
    }

    // If there's roomCode and socket
    if (roomCodeEnter.trim() && socket) {
      // Remove the spaces and convert to correct format
      const cleanedCode = cleanCode(roomCodeEnter);
      // Check if room exists
      socket.emit("roomExists", cleanedCode, (roomExists) => {
        // Callback. No room - no access
        if (!roomExists) {
          return triggerError("The room code is doesn't exist.");
        }
        // Join the room
        socket.emit("joinRoom", {
          roomCode: roomCodeEnter,
          username: username,
        });
        // Save to session storage for refresh persistence
        persistSession(username, roomCodeEnter);
        // Clear the form
        setRoomCodeEnter("");
        // Move to the room
        // navigate(`/room/${cleanedCode}`);
        socket.once("roomJoined", ({ roomCode }) => {
          navigate(`/room/${roomCode}`);
        });
      });
    }
  };

  // Create a new room
  const handleCreateRoom = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      showNotification(
        "Please enter a username before creating a room.",
        "error",
      );
      return;
    }

    if (!socket) return;

    // Remove the spaces and convert to correct format
    const cleanedCode = cleanCode(roomCodeCreate);

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
          return showNotification("The room code is not unique.", "error");
        }
        emitCreate(cleanedCode);
      });
    } else {
      // Let the server generate a code
      emitCreate("");
    }

    // Listen for roomCreated once and use the server-provided code
    socket.once("roomCreated", ({ roomCode, users }) => {
      persistSession(username, roomCode);

      navigate(`/room/${roomCode}`, {
        state: { username, users, roomCodeEnter: roomCode },
      });
    });
  };

  return (
    <div className="homePage">
      {/* Username box */}
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

      {/* Room forms */}
      <div className="rooms">
        {/* Joining */}
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
              onChange={(e) => setRoomCodeEnter(e.target.value.toUpperCase())}
              required
            />
            <button className="fancyButton" type="submit">
              Join Game
            </button>
          </form>
        </div>

        <p>Or</p>

        {/* Creating */}
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
              onChange={(e) => setRoomCodeCreate(e.target.value.toUpperCase())}
            />
            <button className="fancyButton" type="submit">
              Create Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Home;
