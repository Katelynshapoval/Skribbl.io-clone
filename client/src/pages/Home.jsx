import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

function Home() {
  const [username, setUsername] = useState(""); // Local state to store username input
  const navigate = useNavigate(); // React Router hook to programmatically navigate
  const socket = useSocket(); // Access shared socket instance from context

  useEffect(() => {
    if (!socket) return; // Wait for socket connection to be established

    // Log socket connection ID when connected
    socket.on("connect", () => {
      console.log("Connected with ID:", socket.id);
    });

    // Listen for a custom server event for debugging or welcome message
    socket.on("helloFromServer", (msg) => {
      console.log("Message from server:", msg);
    });

    // Cleanup listeners on component unmount or socket change
    return () => {
      socket.off("connect");
      socket.off("helloFromServer");
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // Navigate to the game room route, passing username via state
      navigate("/room", { state: { username } });
      console.log("Username submitted:", username);

      // Notify server that this user is joining the game
      if (socket) {
        socket.emit("joinGame", { username });
      }

      // Clear input field after submission
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
