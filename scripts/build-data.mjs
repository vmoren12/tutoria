#!/usr/bin/env node
/**
 * Genera `data/bundle.js` a partir de `data/taxonomia.json`, de tots els
 * fitxers de `data/dinamiques/*.json`, de la bibliografia i de les traduccions
 * al català de `data/traduccions/ca/*.json`.
 *
 * Els fitxers de `data/dinamiques/` són els originals en castellà. Quan una
 * dinàmica té traducció, el bundle desa el text català com a principal i guarda
 * l'original castellà dins de `es`, de manera que l'aplicació pot mostrar
 * qualsevol de les dues llengües sense perdre'n cap.
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
const TRAD = path.join(ROOT, 'data', 'traduccions', 'ca');
const OUT = path.join(ROOT, 'data', 'bundle.js');

const CAMPS_TEXT = [
  'materials', 'resum', 'objectius', 'participants', 'espai',
  'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes', 'font',
];

/* Camps que es tradueixen. `font` no: és la citació de l'obra original. */
const CAMPS_TRADUIBLES = ['titol', ...CAMPS_TEXT.filter((c) => c !== 'font')];

function fatal(msg) {
  console.error('Error: ' + msg);
  process.exitCode = 1;
}

async function llegeix_opcional(fitxer, per_defecte) {
  try {
    return JSON.parse(await readFile(fitxer, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return per_defecte;
    throw error;
  }
}

const taxonomia = JSON.parse(await readFile(path.join(ROOT, 'data', 'taxonomia.json'), 'utf8'));
const categories = new Set(taxonomia.categories.map((c) => c.id));
const etiquetes = new Set(taxonomia.etiquetes.map((t) => t.id));
const grups = new Set(taxonomia.grups.map((g) => g.id));

const bibliografia = await llegeix_opcional(
  path.join(ROOT, 'data', 'bibliografia.json'), { introduccio: '', obres: [], eines: [] });

const fitxers = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
const dinamiques = [];
const vistos = new Set();
let avisos = 0;
let traduides = 0;

for (const fitxer of fitxers) {
  const contingut = JSON.parse(await readFile(path.join(DIR, fitxer), 'utf8'));
  const traduccions = await llegeix_opcional(path.join(TRAD, fitxer), {});
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

    // El català passa a davant i el castellà original es guarda dins de `es`.
    const traduccio = traduccions[d.id];
    if (traduccio) {
      const original = {};
      for (const camp of CAMPS_TRADUIBLES) {
        const catala = (traduccio[camp] || '').trim();
        if (!catala || catala === net[camp]) continue;
        if (net[camp]) original[camp] = net[camp];
        net[camp] = catala;
      }
      if (Object.keys(original).length) {
        net.es = original;
        traduides++;
      }
    }

    dinamiques.push(net);
  }
}

dinamiques.sort((a, b) => a.titol.localeCompare(b.titol, 'ca'));

const capcalera = `/* Fitxer generat per scripts/build-data.mjs. No l'editeu a mà.\n` +
  `   Font: data/taxonomia.json + data/dinamiques/*.json\n` +
  `         + data/traduccions/ca/*.json + data/bibliografia.json\n` +
  `   Dinàmiques: ${dinamiques.length} (${traduides} amb versió catalana) */\n`;

await writeFile(
  OUT,
  capcalera + 'window.TUTORIA_DATA = ' +
    JSON.stringify({ versio: 2, taxonomia, bibliografia, dinamiques }) + ';\n',
  'utf8',
);

console.log(`bundle.js generat amb ${dinamiques.length} dinàmiques de ${fitxers.length} fitxers.`);
console.log(`${traduides} dinàmiques amb text català; ${dinamiques.length - traduides} només en castellà.`);
if (avisos) console.log(`${avisos} avís(os) de taxonomia.`);
