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
  const [message, setMessage] = useState("");

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

    socket.on("roomJoined", handleRoomJoined);
    socket.on("userJoinedMessage", handleUserJoined);
    socket.on("userLeftMessage", handleUserLeft);
    socket.on("readyStatus", handleReadyStatus);

    // Cleanup listeners on unmount
    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("userJoinedMessage", handleUserJoined);
      socket.off("userLeftMessage", handleUserLeft);
      socket.off("readyStatus", handleReadyStatus);
    };
  }, [socket, navigate]);

  const sendReadyStatus = (status) => {
    if (!socket) return;
    socket.emit("sendReadyStatus", { username, ready: status });
  };

  return (
    <div>
      <h1>Welcome to the Room, {username}!</h1>
      <p>Room Code: {roomCode || "Not provided"}</p>

      {message && <div className="notification">{message}</div>}

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
      <DrawingBoard />
      <div>
        <button onClick={() => sendReadyStatus(true)}>Start</button>
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
