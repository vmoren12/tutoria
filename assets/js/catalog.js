/* catalog.js - vista de catàleg: cerca, filtres facetats i resultats. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  var PASSA = 48;                 // resultats per tanda
  var VISIBLES_PER_FACETA = 8;    // opcions abans de "mostra'n més"

  var estat = {
    filtres: TUT.search.inicials(),
    ordre: 'titol',
    vista: 'graella',
    limit: PASSA,
    desplegat: {},
    resultats: [],
  };

  var arrel = null;
  var temporitzador_cerca = null;

  /* --- plantilles ---------------------------------------------------- */

  function opcions_faceta(clau, nom, opcions, seleccionades, recomptes, tipus) {
    var desplegat = estat.desplegat[clau];
    var visibles = desplegat ? opcions : opcions.slice(0, VISIBLES_PER_FACETA);
    var html = visibles.map(function (o) {
      var n = recomptes[o.id] || 0;
      var marcat = seleccionades.indexOf(o.id) >= 0;
      return '<li><label class="filtres__opcio"' +
        (o.descripcio ? ' title="' + esc(o.descripcio) + '"' : '') + '>' +
        '<input type="' + tipus + '" name="' + nom + '" value="' + esc(o.id) + '"' +
          (marcat ? ' checked' : '') + (n === 0 && !marcat ? ' disabled' : '') + '>' +
        '<span>' + esc(o.nom) + '</span>' +
        '<span class="filtres__recompte">' + n + '</span>' +
      '</label></li>';
    }).join('');

    if (opcions.length > VISIBLES_PER_FACETA) {
      html += '<li><button type="button" class="filtres__mes" data-desplega="' + clau + '">' +
        (desplegat ? 'Mostra\'n menys' : 'Mostra\'n ' + (opcions.length - VISIBLES_PER_FACETA) + ' més') +
        '</button></li>';
    }
    return '<ul class="filtres__llista">' + html + '</ul>';
  }

  /* Les categories venen de fonts amb lògiques diferents (les dinàmiques de
     grup, els blocs del Programa HEBE i els eixos de Sigues tu) i es presenten
     separades perquè es vegi d'on surt cada una. */
  function faceta_categories(seleccionades, recomptes) {
    return TUT.data.families().map(function (f) {
      var opcions = TUT.data.categories_de(f.id);
      if (!opcions.length) return '';
      return '<p class="filtres__familia">' + esc(f.nom) + '</p>' +
        opcions_faceta('categories:' + f.id, 'categories', opcions,
          seleccionades, recomptes, 'checkbox');
    }).join('');
  }

  function panell_filtres() {
    var tot = TUT.data.tot();
    var tax = TUT.data.taxonomia;
    var f = estat.filtres;

    var rt = TUT.data.recomptes(TUT.search.filtra(tot, f, 'tipus'));
    var rn = TUT.data.recomptes(TUT.search.filtra(tot, f, 'nivells'));
    var rc = TUT.data.recomptes(TUT.search.filtra(tot, f, 'categories'));
    var re = TUT.data.recomptes(TUT.search.filtra(tot, f, 'etiquetes'));
    var rg = TUT.data.recomptes(TUT.search.filtra(tot, f, 'grups'));

    return '' +
      '<div class="filtres__grup">' +
        '<legend>Tipus de proposta</legend>' +
        opcions_faceta('tipus', 'tipus', tax.tipus || [], f.tipus, rt.tipus, 'checkbox') +
        '<p class="filtres__ajuda">Les unitats didàctiques agrupen activitats; ' +
          'les dinàmiques de grup es fan soltes.</p>' +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Nivell</legend>' +
        opcions_faceta('nivells', 'nivells', tax.nivells || [], f.nivells, rn.nivells, 'checkbox') +
        '<p class="filtres__ajuda">Les propostes sense nivell assignat serveixen per a ' +
          'qualsevol curs i surten sempre.</p>' +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Categoria</legend>' +
        faceta_categories(f.categories, rc.categories) +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Etiquetes</legend>' +
        opcions_faceta('etiquetes', 'etiquetes', tax.etiquetes, f.etiquetes, re.etiquetes, 'checkbox') +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Mida del grup</legend>' +
        opcions_faceta('grups', 'grups', tax.grups.map(function (g) {
          return { id: g.id, nom: g.nom + (g.detall ? ' (' + g.detall + ')' : '') };
        }), f.grups, rg.grups, 'checkbox') +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Durada màxima</legend>' +
        '<ul class="filtres__llista">' +
          [0, 10, 15, 20, 30, 45, 60].map(function (m) {
            return '<li><label class="filtres__opcio">' +
              '<input type="radio" name="durada_max" value="' + m + '"' +
                (f.durada_max === m ? ' checked' : '') + '>' +
              '<span>' + (m ? 'Fins a ' + m + ' min' : 'Qualsevol') + '</span>' +
            '</label></li>';
          }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Material</legend>' +
        '<ul class="filtres__llista">' +
          [['tot', 'Indiferent'], ['sense', 'Sense material'], ['amb', 'Amb material']]
            .map(function (o) {
              return '<li><label class="filtres__opcio">' +
                '<input type="radio" name="material" value="' + o[0] + '"' +
                  (f.material === o[0] ? ' checked' : '') + '>' +
                '<span>' + o[1] + '</span></label></li>';
            }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="filtres__grup">' +
        '<legend>Origen</legend>' +
        '<ul class="filtres__llista">' +
          [['tot', 'Totes'], ['cataleg', 'Del catàleg'], ['propies', 'Pròpies i editades']]
            .map(function (o) {
              return '<li><label class="filtres__opcio">' +
                '<input type="radio" name="origen" value="' + o[0] + '"' +
                  (f.origen === o[0] ? ' checked' : '') + '>' +
                '<span>' + o[1] + '</span></label></li>';
            }).join('') +
        '</ul>' +
      '</div>';
  }

  function xips() {
    var f = estat.filtres;
    var trossos = [];

    function xip(text, tipus, valor) {
      trossos.push('<span class="xip">' + esc(text) +
        '<button type="button" data-treu="' + tipus + '" data-valor="' + esc(valor || '') +
        '" aria-label="Treu el filtre">&times;</button></span>');
    }

    if (f.consulta) xip('«' + f.consulta + '»', 'consulta');
    f.tipus.forEach(function (t) { xip(TUT.data.nom_tipus(t), 'tipus', t); });
    f.nivells.forEach(function (n) { xip(TUT.data.nom_nivell(n), 'nivells', n); });
    f.categories.forEach(function (c) { xip(TUT.data.nom_categoria(c), 'categories', c); });
    f.etiquetes.forEach(function (t) { xip(TUT.data.nom_etiqueta(t), 'etiquetes', t); });
    f.grups.forEach(function (g) { xip(TUT.data.nom_grup(g), 'grups', g); });
    if (f.durada_max) xip('Fins a ' + f.durada_max + ' min', 'durada_max');
    if (f.material !== 'tot') xip(f.material === 'sense' ? 'Sense material' : 'Amb material', 'material');
    if (f.origen !== 'tot') xip(f.origen === 'propies' ? 'Pròpies i editades' : 'Del catàleg', 'origen');

    if (!trossos.length) return '';
    return trossos.join('') +
      '<button type="button" class="boto boto--pla boto--petit" data-neteja>Neteja-ho tot</button>';
  }

  function resultats_html() {
    var visibles = estat.resultats.slice(0, estat.limit);
    if (!visibles.length) {
      return '<div class="buit">' +
        '<p>No hi ha cap proposta que compleixi aquests criteris.</p>' +
        '<button type="button" class="boto" data-neteja>Neteja els filtres</button>' +
      '</div>';
    }
    var pinta = estat.vista === 'llista' ? TUT.ui.fila : TUT.ui.targeta;
    var html = '<div class="graella"' +
      (estat.vista === 'llista' ? ' style="grid-template-columns:minmax(0,1fr)"' : '') + '>' +
      visibles.map(pinta).join('') + '</div>';

    if (estat.resultats.length > estat.limit) {
      html += '<div class="centrat" style="margin-top:24px">' +
        '<button type="button" class="boto" data-mes>Mostra\'n ' +
        Math.min(PASSA, estat.resultats.length - estat.limit) + ' més</button>' +
        '<p class="petit tenue" style="margin-top:8px">' + estat.limit + ' de ' +
        estat.resultats.length + '</p></div>';
    }
    return html;
  }

  function calcula() {
    estat.resultats = TUT.search.ordena(
      TUT.search.filtra(TUT.data.tot(), estat.filtres), estat.ordre);
  }

  function pinta_resultats() {
    dom.$('#resultats', arrel).innerHTML = resultats_html();
    dom.$('#recompte', arrel).textContent = estat.resultats.length === 1
      ? '1 proposta' : estat.resultats.length + ' propostes';
    dom.$('#xips', arrel).innerHTML = xips();
  }

  function pinta_filtres() {
    dom.$('#filtres', arrel).innerHTML = panell_filtres();
  }

  function refresca(reinicia_limit) {
    if (reinicia_limit !== false) estat.limit = PASSA;
    calcula();
    pinta_filtres();
    pinta_resultats();
    TUT.app.actualitza_hash(TUT.search.a_parametres(estat.filtres, estat.ordre));
  }

  /* --- esdeveniments -------------------------------------------------- */

  function llegeix_caselles(nom) {
    return dom.$$('input[name="' + nom + '"]:checked', arrel).map(function (i) { return i.value; });
  }

  function connecta() {
    var cerca = dom.$('#cerca', arrel);
    cerca.addEventListener('input', function () {
      clearTimeout(temporitzador_cerca);
      temporitzador_cerca = setTimeout(function () {
        estat.filtres.consulta = cerca.value.trim();
        refresca();
      }, 180);
    });

    dom.$('#ordre', arrel).addEventListener('change', function (event) {
      estat.ordre = event.target.value;
      refresca(false);
    });

    dom.$('#vista', arrel).addEventListener('change', function (event) {
      estat.vista = event.target.value;
      TUT.store.actualitza_preferencies({ vista: estat.vista });
      pinta_resultats();
    });

    dom.$('#filtres', arrel).addEventListener('change', function (event) {
      var camp = event.target;
      if (camp.type === 'checkbox') {
        estat.filtres[camp.name] = llegeix_caselles(camp.name);
      } else if (camp.name === 'durada_max') {
        estat.filtres.durada_max = Number(camp.value);
      } else if (camp.name) {
        estat.filtres[camp.name] = camp.value;
      }
      refresca();
    });

    dom.delega(arrel, 'click', '[data-desplega]', function (event, boto) {
      var clau = boto.dataset.desplega;
      estat.desplegat[clau] = !estat.desplegat[clau];
      pinta_filtres();
    });

    dom.delega(arrel, 'click', '[data-treu]', function (event, boto) {
      var tipus = boto.dataset.treu;
      var valor = boto.dataset.valor;
      if (tipus === 'consulta') {
        estat.filtres.consulta = '';
        dom.$('#cerca', arrel).value = '';
      } else if (tipus === 'durada_max') {
        estat.filtres.durada_max = 0;
      } else if (tipus === 'material' || tipus === 'origen') {
        estat.filtres[tipus] = 'tot';
      } else {
        estat.filtres[tipus] = estat.filtres[tipus].filter(function (v) { return v !== valor; });
      }
      refresca();
    });

    dom.delega(arrel, 'click', '[data-neteja]', function () {
      estat.filtres = TUT.search.inicials();
      dom.$('#cerca', arrel).value = '';
      refresca();
    });

    dom.delega(arrel, 'click', '[data-mes]', function () {
      estat.limit += PASSA;
      pinta_resultats();
    });

    dom.delega(arrel, 'click', '[data-afegeix]', function (event, boto) {
      TUT.ui.afegeix_a_sessio(boto.dataset.afegeix).then(function (afegida) {
        if (!afegida) return;
        TUT.app.actualitza_comptador();
        pinta_resultats();   // per marcar la targeta com a "A la sessió"
      });
    });

    dom.delega(arrel, 'click', '[data-treu-sessio]', function (event, boto) {
      if (!TUT.ui.treu_de_sessio(boto.dataset.treuSessio)) return;
      TUT.app.actualitza_comptador();
      pinta_resultats();
    });

    dom.$('#obre-filtres', arrel).addEventListener('click', function (event) {
      var panell = dom.$('#filtres', arrel);
      var obert = panell.classList.toggle('es-obert');
      event.currentTarget.setAttribute('aria-expanded', String(obert));
    });
  }

  /* --- muntatge -------------------------------------------------------- */

  function render(contenidor, parametres) {
    arrel = contenidor;
    var llegit = TUT.search.de_parametres(parametres);
    estat.filtres = llegit.filtres;
    estat.ordre = llegit.ordre || TUT.store.estat.preferencies.ordre || 'titol';
    estat.vista = TUT.store.estat.preferencies.vista || 'graella';
    estat.limit = PASSA;

    arrel.innerHTML = '' +
      '<div class="vista__capcalera">' +
        '<div>' +
          '<h1 class="vista__titol">Catàleg de propostes</h1>' +
          '<p class="vista__descripcio">Dinàmiques de grup, activitats de tutoria i unitats ' +
            'didàctiques. Cerca per paraula clau i filtra per tipus de proposta, nivell, ' +
            'categoria, durada, mida de grup o material per muntar la sessió.</p>' +
        '</div>' +
        '<div class="vista__accions">' +
          '<a class="boto" href="#/dinamica/nova">' + dom.icona('mes') + 'Nova proposta</a>' +
        '</div>' +
      '</div>' +

      '<div class="cataleg">' +
        '<aside id="filtres" class="filtres" aria-label="Filtres del catàleg"></aside>' +
        '<div>' +
          '<div class="eines">' +
            '<div class="cerca">' + dom.icona('cerca', 'cerca__icona') +
              '<input type="search" id="cerca" placeholder="Cerca per títol, objectius o contingut" ' +
                'aria-label="Cerca dinàmiques" value="' + esc(estat.filtres.consulta) + '">' +
            '</div>' +
            '<button type="button" class="boto filtres__cinta" id="obre-filtres" ' +
              'aria-expanded="false" aria-controls="filtres">Filtres</button>' +
            '<select id="ordre" class="eines__select" aria-label="Ordena els resultats">' +
              '<option value="titol">Ordena per títol</option>' +
              '<option value="tipus">Tipus de proposta</option>' +
              '<option value="durada-asc">Durada, de menys a més</option>' +
              '<option value="durada-desc">Durada, de més a menys</option>' +
              '<option value="categoria">Categoria</option>' +
            '</select>' +
            '<select id="vista" class="eines__select" aria-label="Format de la llista">' +
              '<option value="graella">Vista de targetes</option>' +
              '<option value="llista">Vista compacta</option>' +
            '</select>' +
          '</div>' +
          '<div class="resultats-info"><strong id="recompte"></strong><span id="xips" class="fila"></span></div>' +
          '<div id="resultats"></div>' +
        '</div>' +
      '</div>';

    dom.$('#ordre', arrel).value = estat.ordre;
    dom.$('#vista', arrel).value = estat.vista;
    connecta();
    refresca();
  }

  TUT.catalog = { render: render };
})(window);
