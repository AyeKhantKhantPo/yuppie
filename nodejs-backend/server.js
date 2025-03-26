require("dotenv").config(); // Load environment variables

const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Ollama } = require("ollama");

// Validate required environment variables
const requiredEnvVars = ["API_KEY", "OLLAMA_URL"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL;
const dir = process.env.UPLOAD_DIR || "./uploads";

// Enable CORS
app.use(cors());

// Set up storage for uploaded files using Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Function to check API key
function check_api_key(authorization) {
  if (!authorization) return false;
  return authorization === API_KEY || authorization === `Bearer ${API_KEY}`;
}

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("Client connected");
  console.log("WebSocket request headers:", req.headers);

  let isAuthorized = false;

  ws.once("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "auth" && check_api_key(data.authorization)) {
      console.log("Client authorized with API key.");
      isAuthorized = true;

      ws.on("message", async (message) => {
        console.log("Received message:", message);
        const data = JSON.parse(message);
        console.log("Parsed message data:", data);

        if (data.type === "text" || data.type === "image") {
          console.log("Handling message of type:", data.type);

          try {
            const aiResponse = await callOllamaModel(
              data.text || "",
              data.image
            );
            console.log("Sending AI response to client:", aiResponse);
            ws.send(JSON.stringify({ type: "text", text: aiResponse }));
          } catch (error) {
            console.error("Error calling Ollama API:", error);
            ws.send(
              JSON.stringify({
                type: "error",
                text: "Failed to get AI response",
              })
            );
          }
        }
      });
    } else {
      console.log("Unauthorized access detected");
      ws.send(JSON.stringify({ type: "error", text: "Unauthorized" }));
      ws.close();
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

async function callOllamaModel(userMessage = "", imageData = "") {
  console.log(
    "Calling Ollama API for model processing with message:",
    userMessage
  );

  const model = "llama3.2-vision";
  const ollama = new Ollama({ host: OLLAMA_URL });

  try {
    let response;
    if (imageData) {
      const imagePath = path.join(dir, `image_${Date.now()}.jpg`);
      fs.writeFileSync(imagePath, Buffer.from(imageData, "base64"));

      response = await ollama.chat({
        model: model,
        messages: [
          {
            role: "user",
            content: userMessage || "What is in this image?",
            images: [fs.readFileSync(imagePath, { encoding: "base64" })],
          },
        ],
      });

      fs.unlinkSync(imagePath);
    } else {
      response = await ollama.chat({
        model: model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage },
        ],
      });
    }

    console.log("Ollama API response:", response);
    return response.message?.content || "No response content";
  } catch (error) {
    console.error("Error calling Ollama API:", error.message || error);
    throw error;
  }
}
