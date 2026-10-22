const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');
const express = require('express');

// server.js connects to MongoDB as soon as it loads, so these read its source
// and package.json instead of running it, and rebuild the two body parsers
// with the same settings to show what they do.
const SERVER = fs.readFileSync(path.join(__dirname, '../../../server.js'), 'utf8');
const PACKAGE = require('../../../package.json');

// True when version a.b.c is the same as or newer than minimum
function atLeast(version, minimum) {
  const have = version.split('.').map(Number);
  const need = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (have[i] !== need[i]) return have[i] > need[i];
  }
  return true;
}

// Posts raw bytes to the app on a free local port and resolves with the
// status. supertest changes a Buffer body, so the compressed bytes wouldn't
// arrive as sent.
async function post(app, route, contentType, body, encoding) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    return await new Promise((resolve, reject) => {
      const headers = { 'Content-Type': contentType, 'Content-Length': body.length };
      if (encoding) headers['Content-Encoding'] = encoding;
      const req = http.request({ host: '127.0.0.1', port: server.address().port, method: 'POST', path: route, headers }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end(body);
    });
  } finally {
    server.close();
  }
}

describe('server.js', () => {
  // A compressed body would go through Node's zlib, where the Oct 21 2026
  // Node security release fixed a Brotli bug that let crafted data run code.
  // No browser compresses a form post or a fetch() body.
  it('should refuse compressed bodies on both body parsers', () => {
    expect(SERVER).toMatch(/express\.urlencoded\(\{[^}]*inflate:\s*false[^}]*\}\)/);
    expect(SERVER).toMatch(/express\.json\(\{[^}]*inflate:\s*false[^}]*\}\)/);
  });

  // Railway's deploy log then shows which Node the app runs on
  it('should log the Node version at startup', () => {
    expect(SERVER).toContain('process.version');
  });
});

describe('body parsers with inflate: false', () => {
  let app;
  let reached;

  beforeEach(() => {
    app = express();
    reached = [];
    app.use(express.urlencoded({ extended: false, inflate: false }));
    app.use(express.json({ limit: '200kb', inflate: false }));
    app.post('/login', (req, res) => {
      reached.push(req.body);
      res.send('ok');
    });
    app.use((err, req, res, _next) => res.status(err.status || 500).send(err.message));
  });

  it('should refuse a Brotli-compressed form post with a 415, before the route', async () => {
    const status = await post(app, '/login', 'application/x-www-form-urlencoded', zlib.brotliCompressSync('email=a%40b.co'), 'br');

    expect(status).toBe(415);
    expect(reached).toEqual([]);
  });

  it('should refuse a compressed JSON body too', async () => {
    const status = await post(app, '/login', 'application/json', zlib.gzipSync('{"truckNumber":"TRK-100"}'), 'gzip');

    expect(status).toBe(415);
    expect(reached).toEqual([]);
  });

  it('should still read normal form posts and JSON', async () => {
    expect(await post(app, '/login', 'application/x-www-form-urlencoded', Buffer.from('email=a%40b.co'))).toBe(200);
    expect(await post(app, '/login', 'application/json', Buffer.from('{"truckNumber":"TRK-100"}'))).toBe(200);
    expect(reached).toEqual([{ email: 'a@b.co' }, { truckNumber: 'TRK-100' }]);
  });

  // What the parsers did before: the Brotli body is decompressed and reaches
  // the route
  it('should have decompressed the same body without inflate: false', async () => {
    const open = express();
    open.use(express.urlencoded({ extended: false }));
    open.post('/login', (req, res) => res.send(req.body.email));

    const status = await post(open, '/login', 'application/x-www-form-urlencoded', zlib.brotliCompressSync('email=a%40b.co'), 'br');

    expect(status).toBe(200);
  });
});

describe('package.json', () => {
  // Railway's builder installs exactly the version in engines. "24.x" let
  // Nixpacks pick whatever 24.x it had, so the security release might never
  // arrive. Bump the pin; don't loosen it.
  it('should pin Node exactly, no older than the Oct 2026 security release', () => {
    expect(PACKAGE.engines.node).toMatch(/^\d+\.\d+\.\d+$/);
    expect(atLeast(PACKAGE.engines.node, '24.22.1')).toBe(true);
  });
});
