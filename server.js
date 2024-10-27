// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Set up multer storage for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads"); // Save uploads in public/uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    },
});
const upload = multer({ storage });

// Serve static files
app.use(express.static("public"));

// Create the uploads directory if it doesn't exist
const fs = require("fs");
if (!fs.existsSync("public/uploads")) {
    fs.mkdirSync("public/uploads", { recursive: true });
}

// Handle image uploads
app.post("/upload", upload.single("image"), (req, res) => {
    if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        io.emit("image", imageUrl); // Emit image URL to all clients
        res.json({ imageUrl });
    } else {
        res.status(400).send("No file uploaded.");
    }
});

// Store users
let users = {};

// Socket.io connection
io.on("connection", (socket) => {
    console.log("New client connected");

    // User login
    socket.on("login", (username) => {
        users[socket.id] = username;
        io.emit("userList", Object.values(users));
        socket.broadcast.emit("message", {
            username: "Server",
            message: `${username} has joined the chat`,
        });
    });

    // Chat message handling
    socket.on("message", (message) => {
        io.emit("message", {
            username: users[socket.id],
            message,
        });
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        const username = users[socket.id];
        delete users[socket.id];
        io.emit("userList", Object.values(users));
        socket.broadcast.emit("message", {
            username: "Server",
            message: `${username} has left the chat`,
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
