const express = require('express');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 8000;
const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const app = express();

// Encoding user input to prevent XSS attacks.
function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// public assets.
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

function renderSearch(req, res, fixed) {
  const url = new URL(req.originalUrl, `http://${HOST}:${PORT}`);
  const query = url.searchParams.get('q');

  // Vulnerability
  const result = query === null ? '' : `<p class="result">Search term: ${fixed ? escapeHtml(query) : query}</p>`;
  const title = fixed ? 'Fixed version' : 'Vulnerable version';

  // Function replacements preserve literal dollar signs in the user's input.
  const page = template.replace('<!--RESULT-->', () => result)
    .replaceAll('<!--TITLE-->', () => title)
    .replace('<!--ACTION-->', () => fixed ? '/fixed' : '/vulnerable');
  res.set('Cache-Control', 'no-store').type('html').send(page);
}

app.get('/', (req, res) => renderSearch(req, res, false));
app.get('/vulnerable', (req, res) => renderSearch(req, res, false));
app.get('/fixed', (req, res) => renderSearch(req, res, true));

if (require.main === module) {
  app.listen(PORT, HOST, () => console.log(`Open http://${HOST}:${PORT}`));
}
module.exports = app;
