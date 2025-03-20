const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    // Handle incoming image data
    const fileName = `uploads/image_${Date.now()}.jpg`;
    fs.writeFile(fileName, message, "binary", (err) => {
      if (err) {
        console.error("Failed to save image:", err);
        ws.send("Failed to upload image");
      } else {
        console.log("Image saved:", fileName);
        ws.send("Image uploaded successfully");
      }
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Create 'uploads' directory if it doesn't exist
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}
