const db = require('../db');
const { parseCookies } = require('../lib/cookies');

const SESSION_COOKIE = 'session';

function lookupUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = db
    .prepare(
      `SELECT sessions.token, sessions.user_id, sessions.expires_at, users.username
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`
    )
    .get(token);

  if (!session) return null;

  if (new Date(session.expires_at) <= new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return { id: session.user_id, username: session.username };
}

// Middleware global: daca exista o sesiune valida, ataseaza req.user.
// Nu blocheaza niciodata cererea - doar populeaza informatia, daca exista.
function attachUser(req, res, next) {
  req.user = lookupUser(req);
  next();
}

// Middleware de ruta: cere ca attachUser sa fi gasit deja un utilizator valid.
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Neautentificat.' });
  }
  next();
}

module.exports = { attachUser, requireAuth };
