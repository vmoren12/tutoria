# Tutoria

Aplicació de referència per a tutors i tutores d'ESO: **cerca, crea i edita dinàmiques de
grup, i munta sessions de tutoria** llestes per imprimir o desar en PDF.

- **717 dinàmiques** en català, classificades en 19 categories i etiquetades per tipus,
  durada, mida de grup i material necessari. L'original castellà es conserva i es pot
  mostrar des dels ajustos.
- **Cerca facetada** per paraula clau, categoria, etiquetes, durada màxima, mida de grup,
  material i origen.
- **Constructor de sessions**: seqüència de blocs amb temps assignat, càlcul d'horaris i
  control de la durada prevista.
- **Full de sessió imprimible** amb el contingut que triïs, pensat per a A4.
- **Tot editable**: qualsevol dinàmica del catàleg es pot modificar o duplicar, i se'n
  poden crear de noves.
- Sense dependències, sense compte d'usuari i sense servidor: les dades es queden al
  navegador.

## Posar-ho en marxa

L'aplicació és HTML, CSS i JavaScript estàtics. N'hi ha prou d'obrir `index.html` amb el
navegador.

Per treballar-hi amb un servidor local:

```bash
npm start          # genera data/bundle.js i serveix a http://localhost:8080
```

o, sense Node:

```bash
python -m http.server 8080
```

## Publicació a GitHub Pages

El repositori ja es pot servir tal com està: `data/bundle.js` es versiona i hi ha un
fitxer `.nojekyll` a l'arrel.

1. **Settings → Pages**.
2. **Source**: `Deploy from a branch`, branca `main`, carpeta `/ (root)`.
3. L'aplicació queda a `https://vmoren12.github.io/tutoria/`.

## Com funciona

| Vista | Què hi pots fer |
| --- | --- |
| **Catàleg** | Cercar i filtrar dinàmiques; afegir-les i treure-les de la sessió activa d'un clic. |
| **Fitxa** | Llegir la dinàmica sencera, editar-la, duplicar-la o imprimir-la. |
| **Sessió actual** | Ordenar els blocs, repartir minuts i escriure notes per bloc. |
| **Sessions** | Gestionar diverses sessions: duplicar, esborrar, canviar l'activa. |
| **Full de sessió** | Triar què surt al full i imprimir-lo o desar-lo en PDF. |
| **Bibliografia** | Consultar les obres d'on provenen les dinàmiques. |
| **Ajustos** | Tema, llengua del catàleg, dades del centre, còpies de seguretat i recuperació. |

Les dinàmiques que ja formen part de la sessió activa surten marcades al catàleg («A la
sessió», amb el nombre de vegades si s'hi repeteixen) i el seu botó passa a **Treu**, de
manera que la sessió es munta i es desmunta sense sortir de la llista. Per repetir una
dinàmica dins d'una mateixa sessió cal fer-ho des de la seva fitxa, que demana confirmació.

En obrir una fitxa i tornar al catàleg, els filtres i la cerca es conserven.

Per desar en PDF: **Full de sessió → Imprimeix** i, al diàleg del navegador, tria
«Desa com a PDF» com a destinació. El resultat és text seleccionable, no una imatge.

## Estructura del projecte

```
index.html                pàgina única
assets/css/               base, aplicació i impressió
assets/js/                mòduls (dom, store, data, search, ui, vistes, app)
data/taxonomia.json       categories, etiquetes, mides de grup i nivells
data/dinamiques/*.json    el catàleg original en castellà, un fitxer per categoria
data/traduccions/ca/*.json  traducció al català, un fitxer per categoria
data/bibliografia.json    obres d'origen de les dinàmiques
data/bundle.js            generat per npm run build
scripts/extract_pdf.py    extractor del PDF font cap a JSON
scripts/tradueix-ca.py    traductor castellà → català (Apertium)
scripts/build-data.mjs    validació i generació del bundle
scripts/serve.mjs         servidor estàtic de desenvolupament
docs/                     arquitectura i guia per aportar dinàmiques
```

L'organització en un fitxer JSON per categoria està pensada perquè el catàleg creixi:
afegir dinàmiques és editar un fitxer i executar `npm run build`. El detall és a
[docs/CONTRIBUTING-dinamiques.md](docs/CONTRIBUTING-dinamiques.md); el disseny tècnic, a
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Ordres

| Ordre | Què fa |
| --- | --- |
| `npm run build` | Valida `data/dinamiques/*.json` i regenera `data/bundle.js`. |
| `npm run serve` | Servidor estàtic a `http://localhost:8080`. |
| `npm start` | `build` i tot seguit `serve`. |
| `npm run extract` | Reconstrueix el catàleg des del PDF font (necessita `pdftotext` i Python 3). |
| `npm run tradueix` | Tradueix al català les fitxes noves o modificades (necessita Python 3 i connexió). |

## Sobre el contingut

Les fitxes provenen del recull *[700 Dinámicas
grupales](https://www.miteco.gob.es/es/ceneam/recursos/pag-web/700-dinamicas-grupales.html)*
(CENEAM), que aplega quatre obres:

- *22 Juegos para conocerse*
- *100 Formas de Animar Grupos* (Alianza Internacional contra el VIH/SIDA, 2002)
- *456 Juegos y Dinámicas de Integración Grupal* (Prof. Enrique González)
- *Juegos y Dinámicas* (recopilació)

La llista completa és a `data/bibliografia.json` i es consulta des de la vista
**Bibliografia** de l'aplicació.

### Les dues llengües

L'original és en castellà i es conserva sencer a `data/dinamiques/`. La versió catalana és
una **traducció automàtica** feta amb [Apertium](https://www.apertium.org/) i es desa a
banda, a `data/traduccions/ca/`. `npm run build` combina totes dues: el bundle porta el
text català com a principal i l'original castellà dins del camp `es` de cada fitxa.

A l'aplicació, **Ajustos → Llengua de les dinàmiques** canvia entre les dues versions sense
perdre'n cap. La traducció és automàtica i no revisada: qualsevol fitxa es pot editar per
corregir-la o adaptar-la al grup, i les versions editades es poden exportar des dels
ajustos i incorporar al repositori.

Per traduir dinàmiques noves n'hi ha prou amb `npm run tradueix`: només processa el que ha
canviat i es pot aturar i reprendre.

L'extracció és automàtica: la classificació per categoria segueix les seccions de les obres
originals, i les etiquetes, la durada i la mida de grup s'infereixen del text. Són valors
orientatius i es poden corregir des de la fitxa.

El PDF original no forma part del repositori (és material de tercers i ocupa 16 MB). Si el
vols tornar a processar, desa'l a l'arrel del projecte amb el nom
`700-Dinámicas-grupales.pdf` i executa `npm run extract`.

## Llicència

Aplicació creada per Víctor Moreno de la Torre, psicòleg i orientador educatiu, amb
l'assistència de Claude (Anthropic).

Codi sota llicència MIT (vegeu [LICENSE](LICENSE)). El peu de l'aplicació ofereix l'obra
sota [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ca): ús,
còpia i modificació lliures i gratuïts, sempre que se'n reconegui l'autoria.

El contingut de les dinàmiques pertany als autors de les obres citades a la
[bibliografia](data/bibliografia.json) i s'inclou amb finalitat educativa.
