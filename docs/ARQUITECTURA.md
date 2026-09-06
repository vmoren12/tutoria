# Arquitectura

Aplicació web estàtica, sense framework ni pas de compilació de codi. Es pot obrir amb
doble clic sobre `index.html` o publicar-la tal qual a GitHub Pages.

## Estructura

```
index.html               una sola pàgina; carrega dades i scripts en ordre
assets/
├── css/
│   ├── base.css         tokens de disseny, reinici, formularis i botons
│   ├── app.css          estructura i components de la interfície
│   └── print.css        full de sessió i regles @media print
└── js/
    ├── dom.js           utilitats de DOM, format de text, icones SVG
    ├── store.js         persistència a localStorage (sessions, dinàmiques, preferències)
    ├── data.js          catàleg en memòria: base + canvis locals
    ├── search.js        filtratge facetat i ordenació
    ├── ui.js            targetes, avisos i diàlegs compartits
    ├── catalog.js       vista de catàleg
    ├── dinamica.js      fitxa i formulari de dinàmica
    ├── sessions.js      llista de sessions i constructor
    ├── imprimir.js      full de sessió imprimible
    ├── ajustos.js       preferències i còpies de seguretat
    └── app.js           arrencada i encaminador
data/                    dades (vegeu CONTRIBUTING-dinamiques.md)
scripts/                 eines de línia d'ordres
```

## Per què `bundle.js` i no `fetch()`

Els navegadors bloquegen `fetch()` sobre fitxers locals (`file://`) per política d'origen.
Perquè l'aplicació funcioni amb doble clic sobre `index.html`, sense servidor, les dades
es publiquen com un fitxer JavaScript que assigna `window.TUTORIA_DATA`.

Els JSON de `data/dinamiques/` continuen sent la font de veritat editable; `data/bundle.js`
és artefacte generat per `scripts/build-data.mjs`, però es versiona perquè GitHub Pages
serveixi el repositori sense cap pas de construcció.

## Espais de noms

Tots els mòduls són scripts clàssics que pengen d'un únic objecte global `window.TUT`:
`TUT.dom`, `TUT.store`, `TUT.data`, `TUT.search`, `TUT.ui`, `TUT.catalog`, `TUT.dinamica`,
`TUT.sessions`, `TUT.imprimir`, `TUT.ajustos` i `TUT.app`. L'ordre de les etiquetes
`<script>` a `index.html` respecta aquestes dependències.

## Model de dades en execució

`TUT.data.reconstrueix()` fusiona tres fonts i deixa el resultat a memòria:

1. `window.TUTORIA_DATA.dinamiques` — el catàleg publicat.
2. `store.estat.dinamiques` — dinàmiques pròpies i sobreescriptures locals, per `id`.
3. `store.estat.esborrades` — ids del catàleg amagats per la persona usuària.

Cada dinàmica resultant porta un camp `origen`: `cataleg`, `modificada` o `propia`.
Editar una dinàmica del catàleg no altera el fitxer original: en desa una còpia local que
sempre es pot revertir des de la seva fitxa o des dels ajustos.

També s'hi calcula `_cerca`, la concatenació normalitzada (minúscules, sense accents) de
tots els camps de text, que fa de índex per a la cerca lliure.

## Encaminament

Encaminador per fragment d'URL, sense dependències:

| Ruta | Vista |
| --- | --- |
| `#/cataleg?q=…&cat=…&eti=…` | catàleg amb filtres a la URL |
| `#/dinamica/:id` | fitxa |
| `#/dinamica/:id/edita` | formulari d'edició |
| `#/dinamica/nova` | formulari de creació |
| `#/sessions` | llista de sessions |
| `#/sessio/:id` | constructor de sessió |
| `#/sessio/:id/impressio` | full imprimible |
| `#/ajustos` | preferències i còpies |

Els filtres del catàleg es reflecteixen a la URL amb `history.replaceState`, de manera que
una cerca es pot desar com a marcador o compartir.

## Impressió i PDF

No hi ha cap biblioteca de generació de PDF. El full de sessió és HTML amb un full d'estil
`@media print` que fixa mida A4, força fons blanc i text negre, amaga la interfície i evita
els talls de pàgina dins d'un bloc. Desar en PDF és triar «Desa com a PDF» com a destinació
al diàleg d'impressió del navegador, cosa que dona text seleccionable i mida de fitxer petita.

## Persistència

Tot es desa a `localStorage`, sota la clau `tutoria.v1`, i no surt mai del navegador. Si
`localStorage` no està disponible (finestra privada, cookies bloquejades) l'aplicació
continua funcionant en mode de només lectura i ho avisa. Els ajustos permeten exportar i
importar una còpia de seguretat completa en JSON.
