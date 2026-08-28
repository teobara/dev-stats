const crypto = require('crypto');

const KEY_LENGTH = 64;

// Hash-uire parola cu scrypt (built-in in Node, fara dependinte externe).
// Nu stocam niciodata parola in clar - doar hash + salt.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

// Genereaza o parola aleatoare, fara caractere ambigue (0/O, 1/l/I),
// mai usor de citit si copiat manual.
function generatePassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

module.exports = { hashPassword, verifyPassword, generatePassword };
