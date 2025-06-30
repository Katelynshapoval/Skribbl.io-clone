import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io("http://localhost:5000");

    socket.current.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      const newMessage = { username, text: currentMessage };
      socket.current.emit("sendMessage", newMessage);
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
