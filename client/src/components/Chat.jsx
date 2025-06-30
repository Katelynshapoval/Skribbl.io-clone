import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const socket = useSocket();
  console.log("Socket in Chat:", socket);

  useEffect(() => {
    if (!socket) return;

    const messageHandler = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("receiveMessage", messageHandler);

    // Cleanup function to remove the listener
    return () => {
      socket.off("receiveMessage", messageHandler);
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      const newMessage = { username, text: currentMessage };
      socket.emit("sendMessage", newMessage);
      setCurrentMessage("");
    }
  };

  return (
    <div>
      <h2>Chat</h2>
      <div className="chat-window">
        <div className="messages">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div key={index} className="message">
                <strong>{msg.username}:</strong> {msg.text}
              </div>
            ))
          ) : (
            <div className="no-messages">No messages yet</div>
          )}
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Type a message..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
