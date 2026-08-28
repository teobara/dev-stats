// Daca variabilele BOOTSTRAP_USERNAME / BOOTSTRAP_PASSWORD sunt setate si acel
// utilizator nu exista inca, il creeaza automat la pornirea serverului.
//
// Util pe Railway (sau orice mediu fara acces usor la o consola/CLI ca sa rulezi
// manual set-password.js) - setezi cele doua variabile din dashboard, faci
// (re)deploy, si utilizatorul e creat automat.
//
// E sigur sa lasi variabilele setate permanent dupa aceea: daca utilizatorul deja
// exista, functia nu face nimic - nu ii reseteaza parola la fiecare restart.
const db = require('./db');
const { hashPassword } = require('./lib/passwords');

function runBootstrap() {
  const username = process.env.BOOTSTRAP_USERNAME;
  const password = process.env.BOOTSTRAP_PASSWORD;

  if (!username || !password) return;

  const existing = db
    .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
    .get(username);
  if (existing) return;

  const { hash, salt } = hashPassword(password);
  db.prepare(
    'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)'
  ).run(username, hash, salt);

  console.log(`Utilizator bootstrap creat: "${username}" (din BOOTSTRAP_USERNAME/BOOTSTRAP_PASSWORD).`);
}

module.exports = { runBootstrap };
