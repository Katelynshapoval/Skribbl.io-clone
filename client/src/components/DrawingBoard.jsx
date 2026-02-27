import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSocket } from "../context/SocketContext";
import "../css/components/drawingBoard.css";

const DrawingBoard = forwardRef(function DrawingBoard(
  { username, userToPaint },
  ref,
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const socket = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [lineWidth, setLineWidth] = useState(3); // Default line width
  const lastErasePoint = useRef(null);

  // Selected color
  const [color, setColor] = useState("#000000");

  // Determine if the user is allowed to draw
  const isAllowedToDraw = userToPaint === username;

  // --- expose the clear() function to Room.jsx ---
  useImperativeHandle(ref, () => ({
    clear,
  }));

  // Initialize canvas once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Change dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
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
          const canvas = canvasRef.current;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      },
    );

    return () => {
      socket.off("drawing");
    };
  }, [socket]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    <div className="drawing-board card">
      <div className="boardInfo">
        <h2 className="roomSubheading">Drawing Board</h2>
        <p>{isAllowedToDraw ? "Spectating" : "Guessing mode"}</p>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          cursor: isAllowedToDraw ? "crosshair" : "not-allowed",
        }}
        onMouseDown={isAllowedToDraw ? startDrawing : undefined}
        onMouseMove={isAllowedToDraw ? draw : undefined}
        onMouseUp={isAllowedToDraw ? stopDrawing : undefined}
      />
      <div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button disabled={!isAllowedToDraw} onClick={() => clear()}>
          Clear
        </button>
        <button
          disabled={!isAllowedToDraw}
          onClick={() => setEraserMode((prev) => !prev)}
        >
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
});

export default DrawingBoard;
