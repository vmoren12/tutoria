# Com afegir o modificar fitxes del catàleg

El catàleg viu a `data/dinamiques/`, amb **un fitxer JSON per categoria**. Cada fitxer és
una llista de fitxes. Afegir-ne de noves vol dir editar un d'aquests fitxers (o crear-ne
un de nou) i tornar a generar el paquet de dades.

El catàleg conté **tres tipus de proposta**, distingits pel camp `tipus`:

| `tipus` | Què és | D'on surt |
| --- | --- | --- |
| `dinamica` | Joc, exercici o tècnica de grup, que es fa sol. És el valor per defecte. | *700 dinámicas grupales*, *Manual de técnicas y dinámicas* i programa *Sigues tu* |
| `activitat` | Activitat d'aula amb material i pauta de treball, part d'una unitat. | Programa HEBE |
| `unitat` | Unitat didàctica de diverses sessions que agrupa activitats. | Programa HEBE |

```
data/
├── taxonomia.json          categories, temes, etiquetes, etiquetes de Sigues tu, mides de grup, nivells
├── bibliografia.json       obres d'origen de les dinàmiques
├── dinamiques/
│   ├── presentacio.json
│   ├── cohesio.json
│   └── ...                 un fitxer per categoria
├── traduccions/ca/
│   ├── presentacio.json
│   └── ...                 traducció al català, mateix nom de fitxer
└── bundle.js               GENERAT — no s'edita a mà
```

## Flux de treball

1. Edita o crea el fitxer de la categoria corresponent a `data/dinamiques/`.
2. Si la fitxa és en castellà, executa `npm run tradueix` per generar-ne la versió
   catalana (vegeu «Les dues llengües» més avall). Si ja l'escrius en català, salta-t'ho.
3. Executa `npm run build`. Això valida les dades i regenera `data/bundle.js`.
4. Obre l'aplicació i comprova que la fitxa surt al catàleg.
5. Fes el commit dels fitxers `data/dinamiques/*.json`, `data/traduccions/ca/*.json` **i**
   de `data/bundle.js`.

`npm run build` avisa si una fitxa té una categoria, una etiqueta, un tipus o un nivell
que no existeix a `data/taxonomia.json`, i falla si hi ha identificadors repetits, falta un
camp obligatori o un vincle entre unitat i activitat apunta a una fitxa inexistent. També
avisa dels **títols repetits**, que solen ser fitxes duplicades.

## Esquema d'una fitxa

```jsonc
{
  "id": "la-teranyina",              // obligatori, únic a tot el catàleg, en minúscules i amb guions
  "titol": "La teranyina",           // obligatori
  "tipus": "dinamica",               // dinamica (per defecte) | activitat | unitat
  "categoria": "presentacio",        // obligatori, id de data/taxonomia.json
  "etiquetes": ["cercle", "sense-material"],
  "nivells": ["3eso"],               // opcional; sense nivells serveix per a qualsevol curs
  "temes": ["convivencia"],          // opcional; de què tracta la proposta
  "siguestu": ["empatia"],           // opcional; etiquetes del web, només a les fitxes de Sigues tu
  "durada": 20,                      // minuts, nombre enter
  "grup": "mitja",                   // petit | mitja | gran
  "materials": "Un cabdell de llana",
  "resum": "Frase o dues que expliquen en què consisteix.",
  "objectius": "Què es vol aconseguir amb la dinàmica.",
  "participants": "A partir de 12 anys",
  "espai": "Aula amb les taules apartades",
  "preparacio": "Què cal deixar preparat abans de començar.",
  "consignes": "Instruccions que es donen al grup abans de començar.",
  "descripcio": "Desenvolupament pas a pas.\n\nSepara els paràgrafs amb una línia en blanc.",
  "avaluacio": "Preguntes per a la posada en comú final.",
  "notes": "Variants, avisos i observacions.",
  "font": "D'on prové la dinàmica."
}
```

Només `id`, `titol`, `categoria` i `descripcio` són obligatoris. La resta de camps
s'ometen si estan buits: l'aplicació només mostra els que tenen contingut.

### Camps controlats

- **`categoria`** i **`etiquetes`**: han d'existir a `data/taxonomia.json`. Si necessites
  una categoria nova, afegeix-la primer a la taxonomia i crea el fitxer corresponent a
  `data/dinamiques/`.
- **`grup`**: `petit` (fins a 12), `mitja` (13 a 30) o `gran` (més de 30).
- **`durada`**: minuts orientatius; a la sessió es pot ajustar bloc a bloc.
- **`tipus`** i **`nivells`**: han d'existir a `data/taxonomia.json`. Si s'ometen, la fitxa
  és una `dinamica` sense nivell assignat, i el filtre de nivell no la descarta mai.
- **`temes`**: la temàtica de la proposta (afectivitat i sexualitat, assetjament,
  pantalles...), de la llista `temes` de `data/taxonomia.json`. A diferència del nivell,
  una fitxa sense temes **no** surt quan es filtra per temàtica, així que només els porten
  les propostes que tracten un tema concret: les de l'HEBE i les de Sigues tu. Els jocs de
  grup no en tenen i es classifiquen per categoria. Els temes de l'HEBE es fixen per unitat
  a `TEMES`, dins de `scripts/extract_hebe.py`, i les activitats hereten els de la seva unitat.
- **`siguestu`**: només a les fitxes del programa *Sigues tu*. Són les etiquetes que el web
  siguestu.cat dona a la sessió d'on surt la fitxa (es veuen a la pàgina de la sessió), amb
  els identificadors de la llista `siguestu` de `data/taxonomia.json`. Totes les dinàmiques
  d'una mateixa sessió porten les mateixes. Si una sessió no en té cap, s'hi posa l'habilitat
  per a la vida que declara. Si una etiqueta encara no és a la taxonomia, cal afegir-la-hi.

### Unitats didàctiques i les seves activitats

Una unitat i les seves activitats s'enllacen amb dos camps que es corresponen:

```jsonc
// la unitat
{ "id": "hebe-3-01", "tipus": "unitat",
  "activitats": ["hebe-3-01-a1", "hebe-3-01-a2"] }

// cada activitat
{ "id": "hebe-3-01-a1", "tipus": "activitat", "unitat": "hebe-3-01" }
```

`npm run build` comprova que tots dos apuntin a fitxes que existeixin. A l'aplicació, la
fitxa de la unitat llista les seves activitats i la de l'activitat enllaça amb la unitat.

## Afegir una categoria nova

1. Afegeix una entrada a `categories` de `data/taxonomia.json`:
   ```json
   { "id": "orientacio", "nom": "Orientació acadèmica", "descripcio": "..." }
   ```
2. Crea `data/dinamiques/orientacio.json` amb `[]` i hi vas afegint dinàmiques.
3. `npm run build`.

## Aportar fitxes creades des de l'aplicació

Les fitxes que es creen o s'editen des de la interfície es desen al navegador. Per
portar-les al repositori:

1. **Ajustos → Exporta les fitxes pròpies**. Es descarrega un JSON amb el mateix
   format que els fitxers de `data/dinamiques/`.
2. Enganxa les entrades al fitxer de la categoria que toqui.
3. Revisa que cada `id` sigui únic i descriptiu (l'exportació en genera d'automàtics
   com `d-lz8k3p-a4f1`; convé substituir-los per un nom llegible).
4. `npm run build` i commit.

## Les dues llengües

`data/dinamiques/` conté l'**original en castellà**, tal com surt de les obres font.
`data/traduccions/ca/` conté la **versió catalana**, amb un fitxer del mateix nom i aquesta
forma:

```jsonc
{
  "la-teranyina": {
    "_signatura": "4eaee8a090a9d4b8",   // resum del text original; el genera l'script
    "titol": "La teranyina",
    "descripcio": "...",
    // la resta de camps de text traduïts
  }
}
```

`npm run build` combina totes dues fonts: el bundle porta el català com a text principal i
l'original castellà dins del camp `es` de cada fitxa. L'aplicació les intercanvia des
d'**Ajustos → Llengua del catàleg**.

```bash
npm run tradueix              # només el que ha canviat
npm run tradueix -- --refes   # torna a traduir-ho tot
python scripts/tradueix-ca.py valors   # només una categoria
```

L'script fa servir el servei públic d'[Apertium](https://www.apertium.org/) (castellà →
català), per tant necessita connexió. La `_signatura` fa que una fitxa ja traduïda no es
torni a enviar mentre no canviï l'original, i el procés es pot aturar i reprendre.

Apertium deixa tal qual uns quants mots d'ús americà que surten sovint a les obres
d'origen («afiche», «papelógrafo», «pizarrón»...). El `GLOSSARI` de `scripts/tradueix-ca.py`
els substitueix en acabat de traduir; si en trobes cap més, afegeix-l'hi.

La traducció és automàtica i no revisada. Per corregir-la a mà, edita directament
`data/traduccions/ca/<categoria>.json` i deixa la `_signatura` tal com està: mentre no
canviï l'original castellà, l'script respectarà el text que hi hagis posat.

Si escrius una fitxa **directament en català**, posa-la a `data/dinamiques/` amb
`"idioma": "ca"` i no li afegeixis entrada de traducció. `npm run tradueix` se la salta (si
no, la passaria per Apertium com si fos castellà) i, sense `es`, el bundle la mostrarà igual
en totes dues llengües. És el cas de les fitxes del programa *Sigues tu*, a
`convivencia.json`, `sexualitats.json` i `consums-habits.json`: cap extractor no toca
aquests fitxers.

## Afegir una obra a la bibliografia

`data/bibliografia.json` alimenta la vista **Bibliografia**. Cada obra és:

```jsonc
{
  "titol": "456 juegos y dinámicas de integración grupal",
  "autoria": "Enrique González",
  "publicacio": "2002",                  // opcional
  "url": "https://...",                  // opcional; si hi és, el títol fa d'enllaç
  "nota": "Comentari breu.",             // opcional
  "font": "456 Juegos y Dinamicas ..."   // opcional; el valor exacte del camp `font`
}                                        // de les fitxes, per comptar-les
```

Quan `font` coincideix amb el camp `font` de les fitxes, la vista mostra quantes n'hi
ha al catàleg. Després d'editar el fitxer, `npm run build`.

## Tornar a generar el catàleg des dels PDF

Hi ha un extractor per obra. `extract` i `extract-hebe` **sobreescriuen** els fitxers de
categoria que generen: si hi has afegit fitxes a mà, guarda-les en un fitxer de categoria
propi que l'extractor no toqui, o fes-ne còpia abans. `extract-manual` treballa d'una altra
manera —**fusiona**: reemplaça només les fitxes que ja porten la seva font i deixa estar la
resta—, perquè escriu en categories compartides amb *700 dinámicas grupales*. Per això va
sempre l'últim: si no, `npm run extract` li esborraria les fitxes.

```bash
npm run extract         # 700 dinámicas grupales  -> categories de dinàmiques de grup
npm run extract-hebe    # Programa HEBE           -> categories dels cinc blocs
npm run extract-manual  # Manual de técnicas...   -> hi afegeix les seves tècniques
npm run deduplica       # treu les fitxes repetides que deixa l'extracció
npm run tradueix        # tradueix al català el que hagi canviat
npm run build
```

Cal `pdftotext` (Xpdf o Poppler) al PATH. Els PDF no formen part del repositori.

### Fitxes repetides

Les quatre obres que aplega *700 dinámicas grupales* comparteixen molts jocs, i
l'extracció els repeteix amb el mateix títol i el text lleugerament diferent.
`npm run deduplica` les detecta comparant el desenvolupament (llindar més tolerant si el
títol és idèntic), conserva la fitxa més completa —omplint-li els camps buits amb els de
les germanes— i esborra la resta, també de `data/traduccions/ca/`. Es pot executar amb
`--prova` per veure què faria sense tocar res, i és idempotent.

Les repeticions entre obres diferents no les detecta cap llindar automàtic, perquè el text
no s'assembla prou: les del *Manual de técnicas y dinámicas* estan llistades a mà a
`REPETIDES`, dins de `scripts/extract_manual.py`, amb la fitxa del catàleg que ja cobreix
cada una. Si n'hi trobes cap més, afegeix-la-hi i torna a executar `npm run extract-manual`.

Del que queda, encara hi ha una vintena de parells que **comparteixen títol però són
propostes diferents** (dos jocs anomenats «El nus», per exemple). No s'esborren: es
distingeixen per la categoria, que surt a la targeta, i `npm run build` els llista com a
avís.
