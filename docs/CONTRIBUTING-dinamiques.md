# Com afegir o modificar dinàmiques

El catàleg viu a `data/dinamiques/`, amb **un fitxer JSON per categoria**. Cada fitxer és
una llista de dinàmiques. Afegir-ne de noves vol dir editar un d'aquests fitxers (o crear-ne
un de nou) i tornar a generar el paquet de dades.

```
data/
├── taxonomia.json          categories, etiquetes, mides de grup, nivells
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
4. Obre l'aplicació i comprova que la dinàmica surt al catàleg.
5. Fes el commit dels fitxers `data/dinamiques/*.json`, `data/traduccions/ca/*.json` **i**
   de `data/bundle.js`.

`npm run build` avisa si una dinàmica té una categoria o una etiqueta que no existeix a
`data/taxonomia.json`, i falla si hi ha identificadors repetits o falta un camp obligatori.

## Esquema d'una dinàmica

```jsonc
{
  "id": "la-teranyina",              // obligatori, únic a tot el catàleg, en minúscules i amb guions
  "titol": "La teranyina",           // obligatori
  "categoria": "presentacio",        // obligatori, id de data/taxonomia.json
  "etiquetes": ["cercle", "sense-material"],
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

## Afegir una categoria nova

1. Afegeix una entrada a `categories` de `data/taxonomia.json`:
   ```json
   { "id": "orientacio", "nom": "Orientació acadèmica", "descripcio": "..." }
   ```
2. Crea `data/dinamiques/orientacio.json` amb `[]` i hi vas afegint dinàmiques.
3. `npm run build`.

## Aportar dinàmiques creades des de l'aplicació

Les dinàmiques que es creen o s'editen des de la interfície es desen al navegador. Per
portar-les al repositori:

1. **Ajustos → Exporta les dinàmiques pròpies**. Es descarrega un JSON amb el mateix
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
d'**Ajustos → Llengua de les dinàmiques**.

```bash
npm run tradueix              # només el que ha canviat
npm run tradueix -- --refes   # torna a traduir-ho tot
python scripts/tradueix-ca.py valors   # només una categoria
```

L'script fa servir el servei públic d'[Apertium](https://www.apertium.org/) (castellà →
català), per tant necessita connexió. La `_signatura` fa que una fitxa ja traduïda no es
torni a enviar mentre no canviï l'original, i el procés es pot aturar i reprendre.

La traducció és automàtica i no revisada. Per corregir-la a mà, edita directament
`data/traduccions/ca/<categoria>.json` i deixa la `_signatura` tal com està: mentre no
canviï l'original castellà, l'script respectarà el text que hi hagis posat.

Si escrius una dinàmica **directament en català**, posa-la a `data/dinamiques/` i no li
afegeixis entrada de traducció: sense `es`, el bundle la mostrarà igual en totes dues
llengües.

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

Quan `font` coincideix amb el camp `font` de les dinàmiques, la vista mostra quantes n'hi
ha al catàleg. Després d'editar el fitxer, `npm run build`.

## Tornar a generar el catàleg des del PDF

`scripts/extract_pdf.py` reconstrueix tot `data/dinamiques/` a partir del PDF original i
**sobreescriu** els fitxers existents. Si has afegit dinàmiques a mà als mateixos fitxers,
les perdràs: guarda-les en un fitxer de categoria propi que l'extractor no toqui, o fes
còpia abans.

```bash
python scripts/extract_pdf.py --pdf "700-Dinámicas-grupales.pdf" --out data/dinamiques
npm run build
```

Cal `pdftotext` (Xpdf o Poppler) al PATH. El PDF no forma part del repositori.
