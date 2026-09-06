#!/usr/bin/env node
/**
 * Servidor estàtic mínim per al desenvolupament local, sense dependències.
 *
 *     node scripts/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ARREL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;

const TIPUS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let fitxer = path.join(ARREL, url === '/' ? 'index.html' : url);

  if (!fitxer.startsWith(ARREL)) {
    res.writeHead(403).end('Prohibit');
    return;
  }
  try {
    if (statSync(fitxer).isDirectory()) fitxer = path.join(fitxer, 'index.html');
    res.writeHead(200, {
      'Content-Type': TIPUS[path.extname(fitxer).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    createReadStream(fitxer).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No trobat');
  }
}).listen(PORT, () => {
  console.log(`Tutoria en marxa a http://localhost:${PORT}`);
});
