const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Ollama } = require("ollama");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Set up storage for uploaded files using Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storage });

// Create 'uploads' directory if it doesn't exist
const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Hardcoded API key
const API_KEY = "loser_use_typescript12345"; // API key

// Ollama API URL
const OLLAMA_URL = "http://192.168.1.235:11434"; // Directly set the Ollama URL here

// Function to check API key
function check_api_key(authorization) {
  if (!authorization) return false;

  // Check if the authorization matches the hardcoded API key
  if (authorization === API_KEY || authorization === `Bearer ${API_KEY}`) {
    return true;
  }

  return false; // Return false if the API key is invalid
}

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("Client connected");

  // Log the WebSocket request headers for debugging
  console.log("WebSocket request headers:", req.headers);

  let isAuthorized = false;

  // Listen for the first message (which should contain the API key)
  ws.once("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "auth" && data.authorization === API_KEY) {
      console.log("Client authorized with API key.");
      isAuthorized = true;

      // If authorized, set up the message handler for further messages
      ws.on("message", async (message) => {
        console.log("Received message:", message);

        const data = JSON.parse(message);
        console.log("Parsed message data:", data);

        if (data.type === "text" || data.type === "image") {
          console.log("Handling message of type:", data.type);

          try {
            // Use the model "llama3.2-vision" for both text and image analysis
            const aiResponse = await callOllamaModel(
              data.text || "",
              data.image
            );
            console.log("Sending AI response to client:", aiResponse);

            // Stream the AI response back to the client
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

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Function to call Ollama API with the "llama3.2-vision" model
async function callOllamaModel(userMessage = "", imageData = "") {
  console.log(
    "Calling Ollama API for model processing with message:",
    userMessage
  );

  const model = "llama3.2-vision"; // Using Llama 3.2-Vision model for both text and image analysis

  try {
    const ollama = new Ollama({ host: OLLAMA_URL });
    let response;

    // If imageData exists, handle image processing
    if (imageData) {
      const imagePath = path.join(dir, `image_${Date.now()}.jpg`);
      fs.writeFileSync(imagePath, Buffer.from(imageData, "base64")); // Save the image to the server

      response = await ollama.chat({
        model: model,
        messages: [
          {
            role: "user",
            content: userMessage || "What is in this image?",
            images: [fs.readFileSync(imagePath, { encoding: "base64" })], // Pass the image as base64
          },
        ],
      });

      fs.unlinkSync(imagePath); // Clean up the uploaded file
    } else {
      // If no image data, process it as a text message
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
