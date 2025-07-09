const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const gameController = require("./controllers/gameController");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

gameController(io);

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
