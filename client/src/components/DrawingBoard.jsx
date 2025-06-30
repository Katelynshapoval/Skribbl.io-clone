import React, { useRef, useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

function DrawingBoard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const socket = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [lineWidth, setLineWidth] = useState(3); // Default line width

  // Selected color
  const [color, setColor] = useState("#000000");

  // Initialize canvas once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  // Listen for drawing data from server and draw it
  useEffect(() => {
    if (!socket) return;

    socket.on("drawing", ({ offsetX, offsetY, type, color: strokeColor }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = strokeColor; // Set color for received strokes
      ctx.lineWidth = lineWidth; // Set line width for received strokes

      if (type === "start") {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
      } else if (type === "draw") {
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      } else if (type === "stop") {
        ctx.closePath();
      } else if (type === "erase") {
        ctx.clearRect(offsetX - 10, offsetY - 10, 20, 20); // Erase a small area
      }
    });

    return () => {
      socket.off("drawing");
    };
  }, [socket]);

  const emitDrawing = (offsetX, offsetY, type) => {
    if (!socket) return;
    socket.emit("drawing", { offsetX, offsetY, type, color }); // send current color with drawing data
  };

  const emitErase = (offsetX, offsetY) => {
    const ctx = ctxRef.current;
    const size = lineWidth; // use current lineWidth for erase size
    ctx.clearRect(offsetX - size, offsetY - size, size + 6, size + 6); // Clear a square area for erasing
    socket.emit("drawing", {
      offsetX,
      offsetY,
      type: "erase",
      lineWidth: size, // send erase size
    });
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;

    if (eraserMode) {
      emitErase(offsetX, offsetY);
      setIsDrawing(true); // Start tracking for continuous erasing
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    emitDrawing(offsetX, offsetY, "start");
  };

  const draw = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;

    if (!isDrawing) return;

    if (eraserMode) {
      emitErase(offsetX, offsetY);
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    emitDrawing(offsetX, offsetY, "draw");
  };

  const stopDrawing = () => {
    if (!ctxRef.current) return;

    if (!eraserMode) {
      ctxRef.current.closePath();
      emitDrawing(null, null, "stop");
    }

    setIsDrawing(false); // Always reset this
  };

  return (
    <div className="drawing-board">
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid black", cursor: "crosshair" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button onClick={() => ctxRef.current.clearRect(0, 0, 400, 400)}>
          Clear
        </button>
        <button onClick={() => setEraserMode((prev) => !prev)}>
          {eraserMode ? "Switch to Draw" : "Erase"}
        </button>
        <input
          type="range"
          min="5"
          max="15"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        ></input>
      </div>
    </div>
  );
}

export default DrawingBoard;
