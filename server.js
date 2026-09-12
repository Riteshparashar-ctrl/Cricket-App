/**
 * CRICVERSE - Server
 * Node.js + Express backend for the CRICVERSE cricket app download website.
 *
 * Handles:
 *  - Serving the static frontend
 *  - Application / APK info API
 *  - Simple session-based auth (signup / login / logout)
 *  - Protected, tracked APK downloads
 *  - Contact form submissions
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'insecure_default_secret';

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DOWNLOADS_FILE = path.join(DATA_DIR, 'downloads.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const APK_PATH = path.join(__dirname, 'public', 'downloads', 'CRICVERSE.apk');

// ---------- Ensure data files exist (first run safety) ----------
function ensureDataFile(filePath, defaultContent) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

ensureDataFile(USERS_FILE, []);
ensureDataFile(DOWNLOADS_FILE, { totalDownloads: 0, history: [] });
ensureDataFile(MESSAGES_FILE, []);

// ---------- Helpers ----------
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Please log in to continue.' });
}

// ---------- Routes ----------

// Serve website root explicitly (also covered by express.static)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Application information
app.get('/api/app-info', (req, res) => {
  res.json({
    name: 'CRICVERSE',
    tagline: 'Everything Cricket. One Powerful App.',
    version: '2.4.1',
    size: '18.6 MB',
    minAndroid: 'Android 8.0+',
    updated: '2026-08-14',
    package: 'com.cricverse.app'
  });
});

// Download statistics
app.get('/api/downloads', (req, res) => {
  const data = readJSON(DOWNLOADS_FILE) || { totalDownloads: 0, history: [] };
  res.json({
    totalDownloads: data.totalDownloads || 0
  });
});

// Current session status (used by frontend to toggle Login/Logout UI)
app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true, name: req.session.name || 'Fan' });
  }
  res.json({ loggedIn: false });
});

// ---------- Auth ----------

app.post('/signup', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const users = readJSON(USERS_FILE) || [];
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  req.session.userId = newUser.id;
  req.session.name = newUser.name;

  res.json({ success: true, message: 'Account created successfully.', name: newUser.name });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const users = readJSON(USERS_FILE) || [];
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const attemptedHash = hashPassword(password, user.salt);
  if (attemptedHash !== user.passwordHash) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  req.session.name = user.name;

  res.json({ success: true, message: 'Logged in successfully.', name: user.name });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// ---------- Download (protected) ----------

app.get('/download', requireAuth, (req, res) => {
  if (!fs.existsSync(APK_PATH)) {
    return res.status(404).json({
      success: false,
      message: 'APK file not found on the server yet. Please check back soon.'
    });
  }

  const data = readJSON(DOWNLOADS_FILE) || { totalDownloads: 0, history: [] };
  data.totalDownloads = (data.totalDownloads || 0) + 1;
  data.history.push({
    userId: req.session.userId,
    timestamp: new Date().toISOString()
  });
  writeJSON(DOWNLOADS_FILE, data);

  res.download(APK_PATH, 'CRICVERSE.apk');
});

// ---------- Contact ----------

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are all required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const messages = readJSON(MESSAGES_FILE) || [];
  messages.push({
    id: crypto.randomUUID(),
    name,
    email,
    message,
    receivedAt: new Date().toISOString()
  });
  writeJSON(MESSAGES_FILE, messages);

  res.json({ success: true, message: 'Thanks! Your message has been received.' });
});

// ---------- 404 fallback for unknown API routes ----------
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

app.listen(PORT, () => {
  console.log(`CRICVERSE server running at http://localhost:${PORT}`);
});