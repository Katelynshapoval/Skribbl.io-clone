import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import Chat from "../components/Chat";
import DrawingBoard from "../components/DrawingBoard";
import { useSocket } from "../context/SocketContext";

function Room() {
  const location = useLocation();
  const username = location.state?.username || "Guest";
  const { roomCode } = useParams(); // from URL /room/:roomCode
  const [users, setUsers] = useState(location.state?.users || []);
  const [message, setMessage] = useState("");

  const socket = useSocket();

  // Log the room code and username when the component mounts
  useEffect(() => {
    if (!socket) return;
    socket.on("userJoinedMessage", ({ message, users }) => {
      console.log("User joined message:", message);
      setUsers(users);
      setMessage(message);
      setTimeout(() => {
        setMessage("");
      }, 5000); // hide message after 5 seconds
    });
    socket.on("userLeftMessage", ({ message, users }) => {
      console.log("User left message:", message);
      setUsers(users);
      setMessage(message);
      setTimeout(() => {
        setMessage("");
      }, 5000); // hide message after 5 seconds
    });
    return () => {
      socket.off("userJoinedMessage");
      socket.off("userLeftMessage");
    };
  }, [socket]);

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
            <li key={index}>{user}</li>
          ))}
        </ul>
      </div>
      <Chat username={username} />
      <DrawingBoard />
    </div>
  );
}

export default Room;
