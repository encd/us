const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// Middleware
app.use(cookieParser()); // Cookie parser middleware to parse cookies
app.use(express.json());  // To handle JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // To serve static files

// Session setup - session expires with browser
app.use(session({
  secret: 'your_secret_key', // Secret key for session signing
  resave: false,             // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until data is stored
  cookie: { 
    secure: false,           // Use true for HTTPS in production
    httpOnly: true,          // Prevent JavaScript from accessing the session cookie
    maxAge: null             // Session cookie will expire when the browser is closed
  }
}));

// Dummy database of users (username: password)
const usersDb = {
  'User1': 'password9900p',
  'User2': 'password9900p'
};

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next(); // If the user is authenticated (session exists)
  } else {
    res.status(401).json({ message: 'Unauthorized access. Please login.' });
  }
}

// Serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login API route
app.post('/', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  if (usersDb[username] && usersDb[username] === password) {
    // Create a session for the user
    req.session.user = { username };
    return res.json({ message: 'Login successful' });
  }

  // Invalid login credentials
  res.status(401).json({ message: 'Invalid credentials' });
});

// Logout API route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({ message: 'Logout successful' });
  });
});

// Chat route (protected)
app.get('/sequre/chat/api', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Socket.IO setup for handling chat messages
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Notify all users that a new user has joined
   io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Notify all users except the newly connected one
    socket.broadcast.emit("message", { userId: "system", message: `User ${socket.id} connected` });

    socket.on("user-message", (data) => {
        io.emit("message", data); // Broadcast message to all clients
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        io.emit("message", { userId: "system", message: `User ${socket.id} disconnected` });
    });
});


// 404 Error Handling
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
