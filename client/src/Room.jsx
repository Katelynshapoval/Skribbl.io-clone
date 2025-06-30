import React from "react";
import { useLocation } from "react-router-dom";
import Chat from "./Chat";

function Room() {
  const location = useLocation();
  const username = location.state?.username || "Guest";
  return (
    <div>
      <h1>Welcome to the Room, {username}!</h1>
      <Chat username={username} />
    </div>
  );
}

export default Room;
