const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

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

wss.on("connection", async (ws, req) => {
  console.log("Client connected");

  // Log the WebSocket request headers for debugging
  console.log("WebSocket request headers:", req.headers);

  // Extract the authorization header from the WebSocket request
  const authorization = req.headers["authorization"];
  console.log("Authorization header:", authorization);

  // Check if the API key is valid
  const isAuthorized = check_api_key(authorization);
  console.log("Is authorized:", isAuthorized);

  if (!isAuthorized) {
    console.log("Unauthorized access detected");
    ws.send(JSON.stringify({ type: "error", text: "Unauthorized" }));
    ws.close();
    return;
  }

  // Handle authorized connections
  ws.on("message", async (message) => {
    console.log("Received message:", message);

    const data = JSON.parse(message);
    console.log("Parsed message data:", data);

    if (data.type === "text") {
      console.log("Handling text message:", data.text);

      try {
        // Call the Ollama API for text chat
        const aiResponse = await callOllamaTextChat(data.text);
        console.log("Sending AI response to client:", aiResponse);

        // Stream the AI response back to the client
        ws.send(JSON.stringify({ type: "text", text: aiResponse }));
      } catch (error) {
        console.error("Error calling Ollama API:", error);
        ws.send(
          JSON.stringify({ type: "error", text: "Failed to get AI response" })
        );
      }
    } else if (data.type === "image") {
      console.log("Handling image message");

      // Handle image upload
      const imagePath = path.join(dir, `image_${Date.now()}.jpg`);
      fs.writeFile(imagePath, Buffer.from(data.image, "base64"), (err) => {
        if (err) {
          console.error("Failed to save image:", err);
          ws.send(
            JSON.stringify({ type: "error", text: "Failed to process image" })
          );
        } else {
          // Call the Ollama API for image analysis
          callOllamaImageAnalysis(
            imagePath,
            data.text || "What is in this image?"
          )
            .then((aiResponse) => {
              console.log("Sending AI response to client:", aiResponse);
              ws.send(JSON.stringify({ type: "text", text: aiResponse }));
              fs.unlinkSync(imagePath); // Clean up the uploaded file
            })
            .catch((error) => {
              console.error("Error calling Ollama API:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  text: "Failed to process image",
                })
              );
              fs.unlinkSync(imagePath); // Clean up the uploaded file
            });
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Function to call Ollama API for text chat
async function callOllamaTextChat(userMessage) {
  console.log("Calling Ollama API for text chat with message:", userMessage);

  const ollamaUrl = "http://192.168.1.235:11434"; // Ollama API endpoint
  const model = "llama2"; // Replace with your preferred model (e.g., llama2, llama3)

  try {
    const response = await axios.post(ollamaUrl, {
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage },
      ],
    });

    console.log("Ollama API response:", response.data);
    return response.data.message.content;
  } catch (error) {
    console.error(
      "Error calling Ollama API:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Function to call Ollama API for image analysis
async function callOllamaImageAnalysis(imagePath, prompt) {
  console.log("Calling Ollama API for image analysis with prompt:", prompt);

  const ollamaUrl = "http://192.168.1.235:11434"; // Ollama API endpoint
  const model = "llama3.2-vision"; // Use Llama 3.2-Vision model for image analysis

  try {
    const response = await axios.post(ollamaUrl, {
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
          images: [fs.readFileSync(imagePath, { encoding: "base64" })], // Pass the image as base64
        },
      ],
    });

    console.log("Ollama API response:", response.data);
    return response.data.message.content;
  } catch (error) {
    console.error(
      "Error calling Ollama API:",
      error.response?.data || error.message
    );
    throw error;
  }
}
