import React, { useEffect } from "react";
import { io } from "socket.io-client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import { SocketProvider } from "./context/SocketContext";
import { NotificationsProvider } from "./context/NotificationsContext";

function App() {
  return (
    <SocketProvider>
      <NotificationsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomCode" element={<Room />} />
          </Routes>
        </Router>
      </NotificationsProvider>
    </SocketProvider>
  );
}

export default App;
