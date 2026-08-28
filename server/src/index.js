require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { basicAuth } = require('./auth');
const developersRouter = require('./routes/developers');
const projectsRouter = require('./routes/projects');
const summaryRouter = require('./routes/summary');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

app.use(cors());
app.use(express.json());
app.use(basicAuth); // protejeaza tot (front-end + api) daca APP_PASSWORD e setat

app.use('/api/developers', developersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/summary', summaryRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

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
