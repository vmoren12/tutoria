# Com afegir o modificar dinàmiques

El catàleg viu a `data/dinamiques/`, amb **un fitxer JSON per categoria**. Cada fitxer és
una llista de dinàmiques. Afegir-ne de noves vol dir editar un d'aquests fitxers (o crear-ne
un de nou) i tornar a generar el paquet de dades.

```
data/
├── taxonomia.json          categories, etiquetes, mides de grup, nivells
├── dinamiques/
│   ├── presentacio.json
│   ├── cohesio.json
│   └── ...                 un fitxer per categoria
└── bundle.js               GENERAT — no s'edita a mà
```

## Flux de treball

1. Edita o crea el fitxer de la categoria corresponent a `data/dinamiques/`.
2. Executa `npm run build`. Això valida les dades i regenera `data/bundle.js`.
3. Obre l'aplicació i comprova que la dinàmica surt al catàleg.
4. Fes el commit dels fitxers `data/dinamiques/*.json` **i** de `data/bundle.js`.

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
