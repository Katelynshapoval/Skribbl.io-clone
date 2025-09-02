import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

function Home() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    // Join room if user is returning
    const handleRoomJoined = ({ roomCode, users }) => {
      navigate(`/room/${roomCode}`, {
        state: { username, users, roomCode },
      });
    };

    // Handle errors
    const handleError = (message) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("error", handleError);

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("error", handleError);
    };
  }, [socket, navigate, username]);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomCode.trim() && socket) {
      // Join the room
      socket.emit("joinRoom", { roomCode, username });
      // Save to session storage for refresh persistence
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("roomCode", roomCode);
      // Clear the form
      setRoomCode("");
    }
  };

  // Create a new room
  const handleCreateRoom = (e) => {
    e.preventDefault();
    // If username is provided
    if (username.trim() && socket) {
      socket.emit("createRoom", { username });

      // Save to session storage for refresh persistence
      socket.once("roomCreated", ({ roomCode, users }) => {
        sessionStorage.setItem("username", username);
        sessionStorage.setItem("roomCode", roomCode);
        navigate(`/room/${roomCode}`, { state: { username, users, roomCode } });
      });
    }
  };

  return (
    <div>
      {error && <div className="errorMessage">{error}</div>}
      <label htmlFor="username">Username:</label>
      <input
        type="text"
        id="username"
        name="username"
        value={username}
        autoComplete="off"
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <h2>Join a Room</h2>
      <form onSubmit={handleJoinRoom}>
        <label htmlFor="roomCode">Room Code:</label>
        <input
          type="text"
          id="roomCode"
          name="roomCode"
          placeholder="Enter room code"
          autoComplete="off"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          required
        />
        <button type="submit">Join Game</button>
      </form>

      <p>Or</p>

      <h2>Create a Room</h2>
      <form onSubmit={handleCreateRoom}>
        <button type="submit">Create Room</button>
      </form>
    </div>
  );
}

export default Home;
