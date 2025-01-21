const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Database setup
mongoose.connect('mongodb://localhost:27017/chatApp', { useNewUrlParser: true, useUnifiedTopology: true });

// Define schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// Passport setup
passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username }, (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    bcrypt.compare(password, user.password, (err, res) => {
      if (err) return done(err);
      if (!res) return done(null, false, { message: 'Incorrect password.' });
      return done(null, user);
    });
  });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => done(err, user));
});

// Middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Authentication routes
app.post('/login', passport.authenticate('local', { successRedirect: '/chat', failureRedirect: '/login' }));
app.post('/signup', (req, res) => {
  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (err) return res.send('Error hashing password');
    const newUser = new User({ username: req.body.username, password: hash });
    newUser.save()
      .then(() => res.redirect('/login'))
      .catch(err => res.send('Error creating user'));
  });
});

// Chat routes
app.get('/chat', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// WebSocket communication setup
let users = {}; // To store connected users
io.on('connection', socket => {
  let currentUser;

  // Set user when they connect
  socket.on('setUser', username => {
    currentUser = username;
    users[username] = socket.id;
    io.emit('userList', Object.keys(users)); // Emit updated user list
  });

  // Send a message to the target user
  socket.on('sendMessage', (to, message) => {
    const from = currentUser;
    const newMessage = new Message({ from, to, message });
    newMessage.save()
      .then(() => {
        if (users[to]) {
          io.to(users[to]).emit('newMessage', { from, message }); // Emit message to the recipient
        }
      })
      .catch(err => console.log('Error saving message:', err));
  });

  // On disconnect, remove the user
  socket.on('disconnect', () => {
    delete users[currentUser];
    io.emit('userList', Object.keys(users)); // Emit updated user list
  });
});

// Fetch old messages
app.get('/messages', (req, res) => {
  const { from, to } = req.query;
  Message.find({ $or: [{ from, to }, { from: to, to: from }] })
    .sort({ timestamp: 1 })
    .then(messages => res.json(messages))
    .catch(err => res.status(500).send('Error fetching messages'));
});

// Start server
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
