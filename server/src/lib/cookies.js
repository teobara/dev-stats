// Parsare minimala a header-ului Cookie, ca sa evitam o dependinta noua (cookie-parser).
// Pentru setarea cookie-urilor folosim res.cookie()/res.clearCookie(), care sunt
// native in Express si nu au nevoie de niciun pachet suplimentar.
function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;

  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const rawValue = pair.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch (_err) {
      cookies[key] = rawValue;
    }
  });

  return cookies;
}

module.exports = { parseCookies };
