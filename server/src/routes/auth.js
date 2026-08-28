const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { verifyPassword } = require('../lib/passwords');
const { parseCookies } = require('../lib/cookies');

const router = express.Router();

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

// Limitare simpla a incercarilor de login, per IP (tinuta in memorie - se
// reseteaza la fiecare restart de server, dar e suficient pentru un instrument intern).
const attempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return { token, expiresAt };
}

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
    path: '/',
  };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (tooManyAttempts(ip)) {
    return res
      .status(429)
      .json({ error: 'Prea multe incercari. Mai incearca peste cateva minute.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Introdu utilizator si parola.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Utilizator sau parola incorecta.' });
  }

  const { token, expiresAt } = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
  res.json({ username: user.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

// GET /api/auth/me - cine sunt, daca sunt autentificat
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Neautentificat.' });
  }
  res.json({ username: req.user.username });
});

module.exports = router;
