require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { attachUser, requireAuth } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const developersRouter = require('./routes/developers');
const projectsRouter = require('./routes/projects');
const summaryRouter = require('./routes/summary');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

// Railway sta in spatele unui proxy invers - avem nevoie de asta ca req.ip
// (folosit la limitarea incercarilor de login) sa fie IP-ul real al clientului.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(attachUser); // populeaza req.user daca exista o sesiune valida (nu blocheaza)

app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Toate rutele de date cer autentificare - login/logout/me raman accesibile fara.
app.use('/api/developers', requireAuth, developersRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/summary', requireAuth, summaryRouter);

// In productie servim buildul React direct din acest server (un singur serviciu pe Railway)
app.use(express.static(CLIENT_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Eroare interna de server.' });
});

app.listen(PORT, () => {
  console.log(`Server pornit pe portul ${PORT}`);
});
