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
  const username = location.state?.username || "Guest";
  const { roomCode } = useParams(); // from URL /room/:roomCode
  const [users, setUsers] = useState(location.state?.users || []);
  const [message, setMessage] = useState("");

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    // User joined message
    socket.on("userJoinedMessage", ({ message, users }) => {
      setUsers(users);
      setMessage(message);
      console.log(users);
      setTimeout(() => {
        setMessage("");
      }, 5000); // hide message after 5 seconds
    });

    // User left message
    socket.on("userLeftMessage", ({ message, users }) => {
      setUsers(users);
      setMessage(message);
      setTimeout(() => {
        setMessage("");
      }, 5000); // hide message after 5 seconds
    });

    // Ready status
    socket.on("readyStatus", ({ username, ready }) => {
      console.log(`${username} is ${ready ? "ready" : "not ready"}`);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.username === username ? { ...user, status: ready } : user
        )
      );
    });
    return () => {
      // Cleanup socket event listeners
      socket.off("userJoinedMessage");
      socket.off("userLeftMessage");
      socket.off("readyStatus");
    };
  }, [socket]);

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
