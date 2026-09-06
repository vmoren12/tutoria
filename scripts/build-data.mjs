#!/usr/bin/env node
/**
 * Genera `data/bundle.js` a partir de `data/taxonomia.json` i de tots els
 * fitxers de `data/dinamiques/*.json`.
 *
 * El bundle permet obrir l'aplicació directament amb doble clic (protocol
 * file://), on `fetch()` sobre fitxers locals està bloquejat pel navegador.
 *
 *     node scripts/build-data.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'dinamiques');
const OUT = path.join(ROOT, 'data', 'bundle.js');

const CAMPS_TEXT = [
  'materials', 'resum', 'objectius', 'participants', 'espai',
  'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes', 'font',
];

function fatal(msg) {
  console.error('Error: ' + msg);
  process.exitCode = 1;
}

const taxonomia = JSON.parse(await readFile(path.join(ROOT, 'data', 'taxonomia.json'), 'utf8'));
const categories = new Set(taxonomia.categories.map((c) => c.id));
const etiquetes = new Set(taxonomia.etiquetes.map((t) => t.id));
const grups = new Set(taxonomia.grups.map((g) => g.id));

const fitxers = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
const dinamiques = [];
const vistos = new Set();
let avisos = 0;

for (const fitxer of fitxers) {
  const contingut = JSON.parse(await readFile(path.join(DIR, fitxer), 'utf8'));
  if (!Array.isArray(contingut)) {
    fatal(`${fitxer}: s'esperava una llista de dinàmiques.`);
    continue;
  }
  for (const d of contingut) {
    if (!d.id || !d.titol || !d.descripcio) {
      fatal(`${fitxer}: dinàmica sense id, titol o descripcio.`);
      continue;
    }
    if (vistos.has(d.id)) {
      fatal(`${fitxer}: identificador repetit "${d.id}".`);
      continue;
    }
    vistos.add(d.id);

    if (!categories.has(d.categoria)) {
      console.warn(`  avís  ${d.id}: categoria desconeguda "${d.categoria}"`);
      avisos++;
    }
    for (const t of d.etiquetes || []) {
      if (!etiquetes.has(t)) {
        console.warn(`  avís  ${d.id}: etiqueta desconeguda "${t}"`);
        avisos++;
      }
    }
    if (d.grup && !grups.has(d.grup)) {
      console.warn(`  avís  ${d.id}: mida de grup desconeguda "${d.grup}"`);
      avisos++;
    }

    const net = {
      id: d.id,
      titol: d.titol,
      categoria: d.categoria,
      etiquetes: [...new Set(d.etiquetes || [])].sort(),
      durada: Number(d.durada) || 15,
      grup: d.grup || 'mitja',
    };
    for (const camp of CAMPS_TEXT) {
      if (d[camp]) net[camp] = String(d[camp]).trim();
    }
    dinamiques.push(net);
  }
}

dinamiques.sort((a, b) => a.titol.localeCompare(b.titol, 'ca'));

const capcalera = `/* Fitxer generat per scripts/build-data.mjs. No l'editeu a mà.\n` +
  `   Font: data/taxonomia.json + data/dinamiques/*.json\n` +
  `   Dinàmiques: ${dinamiques.length} */\n`;

await writeFile(
  OUT,
  capcalera + 'window.TUTORIA_DATA = ' +
    JSON.stringify({ versio: 1, taxonomia, dinamiques }) + ';\n',
  'utf8',
);

console.log(`bundle.js generat amb ${dinamiques.length} dinàmiques de ${fitxers.length} fitxers.`);
if (avisos) console.log(`${avisos} avís(os) de taxonomia.`);
