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
import { createHash } from 'node:crypto';
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
/* Les categories dels jocs de grup porten els temes (i algunes etiquetes) que
   hereten totes les seves fitxes; així no cal repetir-los fitxa a fitxa. */
const per_categoria = new Map(taxonomia.categories.map((c) => [c.id, c]));
const etiquetes = new Set(taxonomia.etiquetes.map((t) => t.id));
const temes = new Set((taxonomia.temes || []).map((t) => t.id));
const grups = new Set(taxonomia.grups.map((g) => g.id));
const tipus = new Set(taxonomia.tipus.map((t) => t.id));
const nivells = new Set(taxonomia.nivells.map((n) => n.id));

const bibliografia = await llegeix_opcional(
  path.join(ROOT, 'data', 'bibliografia.json'), { introduccio: '', obres: [], eines: [] });

const fitxers = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
const dinamiques = [];
const vistos = new Set();
let avisos = 0;
let traduides = 0;
let en_catala = 0;

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
    for (const t of d.temes || []) {
      if (!temes.has(t)) {
        console.warn(`  avís  ${d.id}: tema desconegut "${t}"`);
        avisos++;
      }
    }
    if (d.grup && !grups.has(d.grup)) {
      console.warn(`  avís  ${d.id}: mida de grup desconeguda "${d.grup}"`);
      avisos++;
    }
    if (d.tipus && !tipus.has(d.tipus)) {
      console.warn(`  avís  ${d.id}: tipus de fitxa desconegut "${d.tipus}"`);
      avisos++;
    }
    for (const n of d.nivells || []) {
      if (!nivells.has(n)) {
        console.warn(`  avís  ${d.id}: nivell desconegut "${n}"`);
        avisos++;
      }
    }

    const categoria = per_categoria.get(d.categoria) || {};
    const net = {
      id: d.id,
      titol: d.titol,
      /* El catàleg base són dinàmiques de grup; els altres tipus de proposta
         (activitats i unitats didàctiques) ho diuen expressament. */
      tipus: d.tipus || 'dinamica',
      categoria: d.categoria,
      etiquetes: [...new Set([...(d.etiquetes || []), ...(categoria.etiquetes || [])])].sort(),
      durada: Number(d.durada) || 15,
      grup: d.grup || 'mitja',
    };
    if (d.nivells && d.nivells.length) net.nivells = [...d.nivells];
    const temes_fitxa = [...new Set([...(d.temes || []), ...(categoria.temes || [])])];
    if (temes_fitxa.length) {
      net.temes = temes_fitxa;
    } else {
      console.warn(`  avís  ${d.id}: no té cap tema`);
      avisos++;
    }
    if (d.unitat) net.unitat = d.unitat;
    if (d.activitats && d.activitats.length) net.activitats = [...d.activitats];
    for (const camp of CAMPS_TEXT) {
      if (d[camp]) net[camp] = String(d[camp]).trim();
    }

    // Les fitxes escrites directament en català no tenen original castellà.
    if (d.idioma === 'ca') en_catala++;

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

/* Els enllaços entre unitats didàctiques i les seves activitats han d'apuntar
   a fitxes que existeixin: si no, la fitxa mostraria un enllaç trencat. */
for (const d of dinamiques) {
  if (d.unitat && !vistos.has(d.unitat)) {
    fatal(`${d.id}: la unitat "${d.unitat}" no existeix.`);
  }
  for (const fill of d.activitats || []) {
    if (!vistos.has(fill)) fatal(`${d.id}: l'activitat "${fill}" no existeix.`);
  }
}

/* Els títols repetits solen ser fitxes duplicades. `npm run deduplica` treu les
   que a més tenen el mateix contingut; les que queden són propostes diferents
   que comparteixen nom i es distingeixen per la categoria. */
const per_titol = new Map();
for (const d of dinamiques) {
  const clau = d.titol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  if (!per_titol.has(clau)) per_titol.set(clau, []);
  per_titol.get(clau).push(d);
}
const repetits = [...per_titol.values()].filter((llista) => llista.length > 1);
for (const llista of repetits) {
  console.warn(`  avís  títol repetit «${llista[0].titol}»: ` +
    llista.map((d) => d.id).join(', '));
}

const recompte = {};
for (const d of dinamiques) recompte[d.tipus] = (recompte[d.tipus] || 0) + 1;
const resum_tipus = taxonomia.tipus
  .filter((t) => recompte[t.id])
  .map((t) => `${recompte[t.id]} ${t.plural}`).join(', ');

const capcalera = `/* Fitxer generat per scripts/build-data.mjs. No l'editeu a mà.\n` +
  `   Font: data/taxonomia.json + data/dinamiques/*.json\n` +
  `         + data/traduccions/ca/*.json + data/bibliografia.json\n` +
  `   Fitxes: ${dinamiques.length} — ${resum_tipus}\n` +
  `           (${traduides} traduïdes del castellà, ${en_catala} escrites en català) */\n`;

await writeFile(
  OUT,
  capcalera + 'window.TUTORIA_DATA = ' +
    JSON.stringify({ versio: 2, taxonomia, bibliografia, dinamiques }) + ';\n',
  'utf8',
);

console.log(`bundle.js generat amb ${dinamiques.length} fitxes de ${fitxers.length} fitxers: ${resum_tipus}.`);
console.log(`${traduides} fitxes traduïdes del castellà; ${en_catala} escrites en català; ` +
  `${dinamiques.length - traduides - en_catala} només en castellà.`);
if (avisos) console.log(`${avisos} avís(os) de taxonomia.`);
if (repetits.length) console.log(`${repetits.length} títol(s) repetit(s).`);

/* --- versió dels assets a index.html --------------------------------------
 *
 * GitHub Pages serveix els fitxers amb `Cache-Control: max-age=600`, de manera
 * que després d'un desplegament el navegador pot combinar l'`index.html` nou
 * amb un CSS o un JS vells i ensenyar la pàgina mig trencada. Per evitar-ho,
 * cada referència a un fitxer propi porta un `?v=` amb un resum del contingut
 * de tots els assets: quan canvia qualsevol fitxer, canvia l'adreça i el
 * navegador la torna a demanar. */

const INDEX = path.join(ROOT, 'index.html');
const REFERENCIA = /\b(href|src)="((?:assets\/[^"?]+|data\/bundle\.js))(?:\?v=[^"]*)?"/g;

/* La versió que surt al peu de pàgina la mana `package.json`, de manera que
   no puguin divergir: aquí només s'hi copia. */
const VERSIO_PEU = /(<span class="peu__versio">)v?[^<]*(<\/span>)/;

let index = await readFile(INDEX, 'utf8');
const rutes = [...new Set([...index.matchAll(REFERENCIA)].map((m) => m[2]))].sort();

const resum = createHash('sha1');
for (const ruta of rutes) resum.update(await readFile(path.join(ROOT, ruta)));
const versio = resum.digest('hex').slice(0, 8);

const paquet = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));

let actualitzat = index.replace(REFERENCIA, (_, atribut, ruta) =>
  `${atribut}="${ruta}?v=${versio}"`);
actualitzat = actualitzat.replace(VERSIO_PEU, `$1v${paquet.version}$2`);

if (actualitzat !== index) {
  await writeFile(INDEX, actualitzat, 'utf8');
  console.log(`index.html: assets marcats amb ?v=${versio} (${rutes.length} fitxers), ` +
    `peu amb v${paquet.version}.`);
} else {
  console.log(`index.html: els assets ja estan marcats amb ?v=${versio} ` +
    `i el peu, amb v${paquet.version}.`);
}
