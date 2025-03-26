const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve static files from "../frontend" directory
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dashboard.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dashboard.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "register.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "login.html"));
});

app.get("/career-quiz", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "quiz.html"));
});

app.get("/job-listings", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "job.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "contact.html"));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
