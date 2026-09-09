#!/usr/bin/env node
/**
 * Treu del catàleg les fitxes repetides de `data/dinamiques/*.json`.
 *
 * Les quatre obres que aplega «700 Dinámicas grupales» comparteixen molts jocs,
 * de manera que l'extracció del PDF produeix la mateixa dinàmica dues o tres
 * vegades, sovint amb el mateix títol i amb el text lleugerament diferent.
 *
 * Dues fitxes es consideren la mateixa quan el desenvolupament s'assembla prou:
 *
 *   - amb el títol idèntic (normalitzat), a partir de LLINDAR_TITOL;
 *   - amb títols diferents, a partir de LLINDAR_TEXT, més exigent.
 *
 * De cada grup es conserva la fitxa més completa i se li omplen els camps buits
 * amb els de les germanes, de manera que no es perd informació. Les entrades
 * corresponents de `data/traduccions/ca/` també s'esborren.
 *
 * És idempotent i es pot tornar a executar després de `npm run extract`.
 *
 *     node scripts/deduplica.mjs [--prova]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'dinamiques');
const TRAD = path.join(ROOT, 'data', 'traduccions', 'ca');

const LLINDAR_TITOL = 0.45;   // mateix títol
const LLINDAR_TEXT = 0.60;    // títols diferents

const CAMPS_TEXT = [
  'materials', 'resum', 'objectius', 'participants', 'espai',
  'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes',
];

const nomes_prova = process.argv.includes('--prova');

function normalitza(text) {
  return String(text || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Paraules significatives del text, per comparar-ne el contingut. */
function mots(text) {
  return new Set(normalitza(text).split(' ').filter((w) => w.length > 4));
}

/** Com de completa és una fitxa: text total i nombre de camps plens. */
function riquesa(d) {
  let mida = 0;
  let plens = 0;
  for (const camp of CAMPS_TEXT) {
    const valor = String(d[camp] || '').trim();
    mida += valor.length;
    if (valor) plens++;
  }
  return { mida, plens };
}

/** La fitxa que es conserva del grup: la més completa; en cas d'empat, la primera. */
function millor(a, b) {
  const ra = riquesa(a);
  const rb = riquesa(b);
  if (ra.mida !== rb.mida) return ra.mida > rb.mida ? a : b;
  if (ra.plens !== rb.plens) return ra.plens > rb.plens ? a : b;
  // Els duplicats duen un sufix numèric a l'identificador: guanya l'original.
  const sa = /-\d+$/.test(a.id);
  const sb = /-\d+$/.test(b.id);
  if (sa !== sb) return sa ? b : a;
  return a.id <= b.id ? a : b;
}

/* --- lectura ---------------------------------------------------------- */

const fitxers = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
const perFitxer = new Map();
const fitxes = [];

for (const fitxer of fitxers) {
  const contingut = JSON.parse(await readFile(path.join(DIR, fitxer), 'utf8'));
  perFitxer.set(fitxer, contingut);
  for (const d of contingut) fitxes.push({ fitxer, d, mots: mots(d.descripcio) });
}

/* --- agrupació de semblants ------------------------------------------- */

/* Índex invertit per no comparar totes les fitxes amb totes: només es miren
   les parelles que comparteixen alguna paraula poc corrent. */
const index = new Map();
fitxes.forEach((f, i) => {
  for (const w of f.mots) {
    if (!index.has(w)) index.set(w, []);
    index.get(w).push(i);
  }
});

const pare = fitxes.map((_, i) => i);
function arrel(i) {
  while (pare[i] !== i) { pare[i] = pare[pare[i]]; i = pare[i]; }
  return i;
}
function uneix(i, j) {
  const a = arrel(i);
  const b = arrel(j);
  if (a !== b) pare[b] = a;
}

fitxes.forEach((f, i) => {
  const comuns = new Map();
  for (const w of f.mots) {
    const llista = index.get(w);
    if (llista.length > 200) continue;          // paraula massa freqüent
    for (const j of llista) if (j > i) comuns.set(j, (comuns.get(j) || 0) + 1);
  }
  for (const [j, n] of comuns) {
    const altra = fitxes[j];
    const s = n / (f.mots.size + altra.mots.size - n);
    const mateix_titol = normalitza(f.d.titol) === normalitza(altra.d.titol);
    if (s >= (mateix_titol ? LLINDAR_TITOL : LLINDAR_TEXT)) uneix(i, j);
  }
});

const grups = new Map();
fitxes.forEach((_, i) => {
  const a = arrel(i);
  if (!grups.has(a)) grups.set(a, []);
  grups.get(a).push(i);
});

/* --- fusió ------------------------------------------------------------- */

const esborrats = new Set();
let fusionats = 0;

for (const membres of grups.values()) {
  if (membres.length < 2) continue;
  fusionats++;
  let guanyadora = fitxes[membres[0]];
  for (const i of membres.slice(1)) {
    guanyadora = millor(guanyadora.d, fitxes[i].d) === guanyadora.d ? guanyadora : fitxes[i];
  }
  const etiquetes = new Set(guanyadora.d.etiquetes || []);

  console.log(`\n${guanyadora.d.titol}  →  es conserva ${guanyadora.d.id} (${guanyadora.fitxer})`);
  for (const i of membres) {
    const f = fitxes[i];
    if (f === guanyadora) continue;
    // Els camps que la fitxa que es conserva té buits s'omplen amb els de l'altra.
    for (const camp of CAMPS_TEXT) {
      if (!String(guanyadora.d[camp] || '').trim() && String(f.d[camp] || '').trim()) {
        guanyadora.d[camp] = f.d[camp];
      }
    }
    for (const t of f.d.etiquetes || []) etiquetes.add(t);
    esborrats.add(f.d.id);
    console.log(`  s'esborra  ${f.d.id} (${f.fitxer})`);
  }
  // «Sense material» només val si, un cop fusionada, la fitxa continua sense material.
  if (String(guanyadora.d.materials || '').trim()) etiquetes.delete('sense-material');
  guanyadora.d.etiquetes = [...etiquetes].sort();
}

/* --- escriptura -------------------------------------------------------- */

console.log(`\n${fusionats} grup(s) de fitxes repetides; ${esborrats.size} fitxa(es) esborrada(es).`);
console.log(`${fitxes.length} → ${fitxes.length - esborrats.size} dinàmiques.`);

if (nomes_prova) {
  console.log('Prova: no s\'ha escrit cap fitxer.');
  process.exit(0);
}
if (!esborrats.size) process.exit(0);

for (const fitxer of fitxers) {
  const abans = perFitxer.get(fitxer);
  const despres = abans.filter((d) => !esborrats.has(d.id));
  await writeFile(path.join(DIR, fitxer), JSON.stringify(despres, null, 2) + '\n', 'utf8');

  // Les traduccions de les fitxes esborrades ja no serveixen per a res.
  const ruta = path.join(TRAD, fitxer);
  let traduccions;
  try {
    traduccions = JSON.parse(await readFile(ruta, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    continue;
  }
  let tocat = false;
  for (const id of Object.keys(traduccions)) {
    if (esborrats.has(id)) { delete traduccions[id]; tocat = true; }
  }
  if (tocat) await writeFile(ruta, JSON.stringify(traduccions, null, 2) + '\n', 'utf8');
}

console.log('Fitxers actualitzats. Executeu `npm run build` per regenerar el bundle.');
