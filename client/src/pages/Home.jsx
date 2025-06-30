import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

function Home() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return; // wait until socket is connected

    socket.on("connect", () => {
      console.log("Connected with ID:", socket.id);
    });

    socket.on("helloFromServer", (msg) => {
      console.log("Message from server:", msg);
    });

    return () => {
      socket.off("connect");
      socket.off("helloFromServer");
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      navigate("/room", { state: { username } });
      console.log("Username submitted:", username);

      if (socket) {
        socket.emit("joinGame", { username });
      }

      setUsername("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="username">Username:</label>
      <input
        type="text"
        id="username"
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <button type="submit">Join Game</button>
    </form>
  );
}

export default Home;
