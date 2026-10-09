# Tutoria

Aplicació de referència per a tutors i tutores d'ESO: **cerca, crea i edita propostes de
tutoria, i munta sessions** llestes per imprimir o desar en PDF.

- **1.082 fitxes** en català, de tres menes:
  - **923 dinàmiques de grup** — jocs, exercicis i tècniques que es fan sols.
  - **125 activitats de tutoria** — activitats d'aula amb material i pauta de treball.
  - **34 unitats didàctiques** — propostes de diverses sessions que agrupen activitats.

  Classificades en 30 categories i etiquetades per durada, mida de grup, nivell i material
  necessari. De les fitxes traduïdes, l'original castellà es conserva i es pot mostrar des
  dels ajustos.
- **Cerca facetada** per paraula clau, tipus de proposta, nivell, temàtica, categoria,
  etiquetes, durada màxima, mida de grup, material i origen. La temàtica (afectivitat i
  sexualitat, assetjament, pantalles, orientació...) creua les fonts i reuneix les unitats de
  l'HEBE i les dinàmiques de Sigues tu sobre un mateix tema. Les dinàmiques de Sigues tu
  es poden filtrar, a més, per les etiquetes del web del programa (Empatia, Drogues,
  Cohesió de grup, Pensament crític...).
- **Constructor de sessions**: seqüència de blocs amb temps assignat, càlcul d'horaris i
  control de la durada prevista.
- **Full de sessió imprimible** amb el contingut que triïs, pensat per a A4.
- **Tot editable**: qualsevol fitxa del catàleg es pot modificar o duplicar, i se'n
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
| **Catàleg** | Cercar i filtrar propostes; afegir-les i treure-les de la sessió activa d'un clic. |
| **Fitxa** | Llegir la proposta sencera, editar-la, duplicar-la o imprimir-la. Les unitats didàctiques hi llisten les seves activitats, i cada activitat enllaça amb la seva unitat. |
| **Sessió actual** | Ordenar els blocs, repartir minuts i escriure notes per bloc. |
| **Sessions** | Gestionar diverses sessions: duplicar, esborrar, canviar l'activa. |
| **Full de sessió** | Triar què surt al full i imprimir-lo o desar-lo en PDF. |
| **Bibliografia** | Consultar les obres d'on provenen les fitxes. |
| **Ajustos** | Tema, llengua del catàleg, dades del centre, còpies de seguretat i recuperació. |

Cada targeta del catàleg diu primer de tot **de quin tipus de proposta es tracta** —
dinàmica de grup, activitat de tutoria o unitat didàctica — i, si escau, a quin curs
s'adreça. El filtre «Tipus de proposta» és el primer del panell, de manera que buscar
només jocs curts o només unitats senceres és un sol clic.

El filtre de **nivell** no descarta mai les fitxes sense nivell assignat: les dinàmiques de
grup serveixen per a qualsevol curs i continuen sortint quan es filtra per 3r o 4t d'ESO.

Les propostes que ja formen part de la sessió activa surten marcades al catàleg («A la
sessió», amb el nombre de vegades si s'hi repeteixen) i el seu botó passa a **Treu**, de
manera que la sessió es munta i es desmunta sense sortir de la llista. Per repetir-ne una
dins d'una mateixa sessió cal fer-ho des de la seva fitxa, que demana confirmació.

En obrir una fitxa i tornar al catàleg, els filtres i la cerca es conserven.

Per desar en PDF: **Full de sessió → Imprimeix** i, al diàleg del navegador, tria
«Desa com a PDF» com a destinació. El resultat és text seleccionable, no una imatge.

## Estructura del projecte

```
index.html                pàgina única
assets/css/               base, aplicació i impressió
assets/js/                mòduls (dom, store, data, search, ui, vistes, app)
data/taxonomia.json       tipus, categories, temes, etiquetes (també les de Sigues tu), mides de grup i nivells
data/dinamiques/*.json    el catàleg original en castellà, un fitxer per categoria
data/traduccions/ca/*.json  traducció al català, un fitxer per categoria
data/bibliografia.json    obres d'origen de les fitxes
data/bundle.js            generat per npm run build
scripts/extract_pdf.py    extractor de «700 dinámicas grupales» cap a JSON
scripts/extract_hebe.py   extractor del «Programa HEBE» cap a JSON
scripts/extract_manual.py extractor del «Manual de técnicas y dinámicas» cap a JSON
scripts/deduplica.mjs     treu les fitxes repetides que deixa l'extracció
scripts/tradueix-ca.py    traductor castellà → català (Apertium)
scripts/esmena-ca.py      esmena del català: castellanismes, calcs i títols
scripts/revisa-ca.py      informe de les fitxes que encara fan sospitar
scripts/build-data.mjs    validació i generació del bundle
scripts/serve.mjs         servidor estàtic de desenvolupament
docs/                     arquitectura i guia per aportar dinàmiques
```

L'organització en un fitxer JSON per categoria està pensada perquè el catàleg creixi:
afegir fitxes és editar un fitxer i executar `npm run build`. El detall és a
[docs/CONTRIBUTING-dinamiques.md](docs/CONTRIBUTING-dinamiques.md); el disseny tècnic, a
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Ordres

| Ordre | Què fa |
| --- | --- |
| `npm run build` | Valida `data/dinamiques/*.json` i regenera `data/bundle.js`. |
| `npm run serve` | Servidor estàtic a `http://localhost:8080`. |
| `npm start` | `build` i tot seguit `serve`. |
| `npm run extract` | Reconstrueix les dinàmiques de grup des de *700 dinámicas grupales* (necessita `pdftotext` i Python 3). |
| `npm run extract-hebe` | Reconstrueix les unitats i activitats des del *Programa HEBE*. |
| `npm run extract-manual` | Incorpora les tècniques del *Manual de técnicas y dinámicas*. |
| `npm run deduplica` | Treu les fitxes repetides que deixa l'extracció (`-- --prova` per veure què faria). |
| `npm run tradueix` | Tradueix al català les fitxes noves o modificades (necessita Python 3 i connexió). |
| `npm run esmena` | Esmena el català traduït: castellanismes, calcs sintàctics i caixa dels títols (`-- --prova` per veure què faria). |
| `npm run revisa` | Llista les fitxes catalanes que encara fan sospitar d'una mala traducció (`-- --tot` per veure-les totes). |

## Sobre el contingut

Les fitxes provenen de quatre obres.

Les **dinàmiques de grup**, del recull *[700 Dinámicas
grupales](https://www.miteco.gob.es/es/ceneam/recursos/pag-web/700-dinamicas-grupales.html)*
(CENEAM), que aplega quatre obres:

- *22 Juegos para conocerse*
- *100 Formas de Animar Grupos* (Alianza Internacional contra el VIH/SIDA, 2002)
- *456 Juegos y Dinámicas de Integración Grupal* (Prof. Enrique González)
- *Juegos y Dinámicas* (recopilació)

Les **unitats didàctiques i les seves activitats**, del *Programa HEBE. Una propuesta de
acción tutorial para 3.º y 4.º de Educación Secundaria Obligatoria* (Lidia E. Santana Vega,
Zuleica Ruiz Alfonso i Milena Trenta; Ediciones Pirámide, 2023): 34 unitats repartides en
cinc blocs — ensenyar a pensar i a aprendre, a ser persona, a conviure, a comportar-se i a
prendre decisions.

Les **tècniques de treball amb el grup**, del *Manual de técnicas y dinámicas* (María de
Jesús Gómez Hernández; SIBE-ECOSUR i UJAT, 2007): 36 tècniques de presentació, relaxació,
animació, treball de continguts i tancament. D'aquí surten tres categories que el recull de
jocs no cobria — **Anàlisi i debat**, **Dramatització** i **Tancament i avaluació** — amb
propostes com la pluja d'idees, el Phillips 6/6, el sociodrama, el joc de rols o el PNI.

Les **dinàmiques d'educació per a la salut**, de les sessions per a l'ESO del programa
*[Sigues tu](https://www.siguestu.cat/)* de Dipsalut, publicades amb llicència
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ca). Cada
dinàmica d'una sessió és una fitxa escrita directament en català, classificada en un dels
tres eixos del programa — **Convivència**, **Sexualitats** i **Consums i hàbits
saludables** — i amb l'enllaç a la sessió original a les notes. De moment hi ha les de les
etiquetes del web que comencen per A, B, C, D i E (de «Abusos sexuals» a «Etiquetes»).
Cada fitxa porta també les etiquetes que el web dona a la seva sessió, que es poden fer
servir com a filtre.
També hi ha les sessions per a l'ESO i primària i les dels itineraris per a centres
d'educació especial; queden fora les que són només d'infantil, de primària o dels CFA. Aquestes
fitxes mantenen la llicència d'origen: es poden reutilitzar sense finalitat comercial,
citant-ne l'autoria.

La llista completa és a `data/bibliografia.json` i es consulta des de la vista
**Bibliografia** de l'aplicació.

### Fitxes repetides

Les quatre obres de *700 dinámicas grupales* comparteixen molts jocs, i l'extracció els
duplicava. `npm run deduplica` compara el desenvolupament de cada parell, conserva la fitxa
més completa i esborra la resta. En queda una vintena de parells que **comparteixen títol
però són propostes diferents**; es distingeixen per la categoria, que surt a la targeta, i
`npm run build` els llista com a avís.

El *Manual de técnicas y dinámicas* beu de la mateixa tradició d'educació popular i repeteix
setze tècniques que ja eren al catàleg, sovint amb un altre títol («Mar adentro y mar
afuera» i «Marea sube/marea baja», «El pueblo manda» i «Simón dice»). No s'incorporen: la
llista, amb la fitxa que ja cobreix cada una, és a `REPETIDES` de
`scripts/extract_manual.py`, i `npm run extract-manual` la imprimeix cada vegada.

### Les dues llengües

L'original és en castellà i es conserva sencer a `data/dinamiques/`. La versió catalana és
una **traducció automàtica** feta amb [Apertium](https://www.apertium.org/) i es desa a
banda, a `data/traduccions/ca/`. `npm run build` combina totes dues: el bundle porta el
text català com a principal i l'original castellà dins del camp `es` de cada fitxa.

A l'aplicació, **Ajustos → Llengua del catàleg** canvia entre les dues versions sense
perdre'n cap. La traducció automàtica s'ha repassat després a fons: `npm run esmena`
aplica les correccions sistemàtiques (castellanismes, complement directe amb «a», «per a»
davant d'infinitiu, apòstrofs, títols en caixa de frase...) i, a sobre, els títols i el cos
de les fitxes s'han revisat a mà contra l'original castellà. `npm run revisa` assenyala el
que encara fa sospitar. Tot i així, qualsevol fitxa es pot editar per adaptar-la al grup, i
les versions editades es poden exportar des dels ajustos i incorporar al repositori.

Per traduir dinàmiques noves n'hi ha prou amb `npm run tradueix` i, tot seguit,
`npm run esmena`: només processen el que ha canviat i es poden aturar i reprendre.

L'extracció és automàtica: la classificació per categoria segueix les seccions de les obres
originals, i les etiquetes, la durada i la mida de grup s'infereixen del text. Són valors
orientatius i es poden corregir des de la fitxa.

Els PDF originals no formen part del repositori (són material de tercers). Si els vols
tornar a processar, desa'ls a l'arrel del projecte i executa l'extractor corresponent
(`npm run extract`, `npm run extract-hebe` i, sempre l'últim, `npm run extract-manual`);
tot seguit, `npm run deduplica`, `npm run tradueix`, `npm run esmena` i `npm run build`.

## Llicència

Aplicació creada per Víctor Moreno de la Torre, psicòleg i orientador educatiu, amb
l'assistència de Claude (Anthropic).

Codi sota llicència MIT (vegeu [LICENSE](LICENSE)). El peu de l'aplicació ofereix l'obra
sota [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ca): ús,
còpia i modificació lliures i gratuïts, sempre que se'n reconegui l'autoria.

El contingut de les fitxes pertany als autors de les obres citades a la
[bibliografia](data/bibliografia.json) i s'inclou amb finalitat educativa.
