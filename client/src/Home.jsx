import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

function Home() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io("http://localhost:5000");

    socket.current.on("connect", () => {
      console.log("Connected with ID:", socket.current.id);
    });

    socket.current.on("helloFromServer", (msg) => {
      console.log("Message from server:", msg);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      navigate("/room", { state: { username } });
      console.log("Username submitted:", username);
      socket.current.emit("joinGame", { username });
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
