// Protectie simpla cu parola comuna (HTTP Basic Auth), utila cand aplicatia
// e publicata online (Railway) si contine date financiare.
// Daca variabila de mediu APP_PASSWORD nu e setata, nu se cere nicio parola
// (comod pentru dezvoltare locala).
function basicAuth(req, res, next) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded;
    if (password === appPassword) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Dev Profit Tracker"');
  return res.status(401).send('Autentificare necesara.');
}

module.exports = { basicAuth };
