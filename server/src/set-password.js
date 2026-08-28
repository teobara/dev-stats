// Creeaza sau reseteaza parola unui utilizator.
//
// Utilizare:
//   node src/set-password.js <username> [parola]
//
// Daca parola lipseste, se genereaza automat una si se afiseaza o singura
// data in consola - nu e stocata nicaieri in clar (doar hash + salt in DB).
require('dotenv').config();
const db = require('./db');
const { hashPassword, generatePassword } = require('./lib/passwords');

const username = process.argv[2];
let password = process.argv[3];

if (!username) {
  console.error('Utilizare: node src/set-password.js <username> [parola]');
  process.exit(1);
}

let generated = false;
if (!password) {
  password = generatePassword();
  generated = true;
}

const { hash, salt } = hashPassword(password);
const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(
    hash,
    salt,
    existing.id
  );
  // Parola s-a schimbat - invalidam sesiunile vechi, ca sa fie nevoie de login din nou.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`Parola actualizata pentru utilizatorul "${username}".`);
} else {
  db.prepare(
    'INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)'
  ).run(username, hash, salt);
  console.log(`Utilizator nou creat: "${username}".`);
}

if (generated) {
  console.log('');
  console.log('Parola generata (o vezi o singura data aici, nu e stocata in clar):');
  console.log(`  ${password}`);
  console.log('');
}
