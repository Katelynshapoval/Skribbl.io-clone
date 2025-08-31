import React, { useRef, useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

function DrawingBoard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const socket = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [lineWidth, setLineWidth] = useState(3); // Default line width
  const lastErasePoint = useRef(null);

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

    socket.on(
      "drawing",
      ({
        offsetX,
        offsetY,
        type,
        color: strokeColor,
        lineWidth: strokeWidth,
      }) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        if (type === "clear") {
          ctx.clearRect(0, 0, 400, 400);
        } else if (type === "eraseStart") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(offsetX, offsetY);
        } else if (type === "eraseDraw") {
          ctx.lineTo(offsetX, offsetY);
          ctx.stroke();
        } else if (type === "eraseStop") {
          ctx.closePath();
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;

          if (type === "start") {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY);
          } else if (type === "draw") {
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
          } else if (type === "stop") {
            ctx.closePath();
          }
        }
      }
    );

    return () => {
      socket.off("drawing");
    };
  }, [socket]);

  const clear = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, 400, 400);
    emitDrawing(null, null, "clear");
  };

  const emitDrawing = (offsetX, offsetY, type) => {
    if (!socket) return;
    socket.emit("drawing", { offsetX, offsetY, type, color, lineWidth }); // send current color with drawing data
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;

    if (eraserMode) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      lastErasePoint.current = { offsetX, offsetY };
      setIsDrawing(true);
      emitDrawing(offsetX, offsetY, "eraseStart");
      return;
    }

    ctx.globalCompositeOperation = "source-over";
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
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
      emitDrawing(offsetX, offsetY, "eraseDraw");
      lastErasePoint.current = { offsetX, offsetY };
      return;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    emitDrawing(offsetX, offsetY, "draw");
  };

  const stopDrawing = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (eraserMode) {
      ctx.closePath();
      emitDrawing(null, null, "eraseStop");
    } else {
      ctx.closePath();
      emitDrawing(null, null, "stop");
    }
    setIsDrawing(false);
    lastErasePoint.current = null;
  };

  return (
    <div className="drawing-board">
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid black", cursor: "crosshair" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
      />
      <div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button onClick={() => clear()}>Clear</button>
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
