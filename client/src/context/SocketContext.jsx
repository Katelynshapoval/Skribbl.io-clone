// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

// Create context to hold the socket instance
const SocketContext = createContext(null);

// Custom hook to access socket from any component
export const useSocket = () => {
  return useContext(SocketContext);
};

// Provider component that initializes and provides the socket connection
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create socket connection once when component mounts
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    // Cleanup: disconnect socket when component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Provide the socket instance to child components
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
