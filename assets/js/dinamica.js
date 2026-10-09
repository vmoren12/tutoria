/* dinamica.js - fitxa detallada d'una dinàmica i formulari de creació/edició. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  var SECCIONS = [
    ['resum', 'En què consisteix'],
    ['objectius', 'Objectius'],
    ['preparacio', 'Preparació'],
    ['consignes', 'Consignes de partida'],
    ['descripcio', 'Desenvolupament'],
    ['avaluacio', 'Avaluació i reflexió'],
    ['notes', 'Observacions i variants'],
  ];

  /* ------------------------------------------------------------------ */
  /* Fitxa                                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Accions de sessió de la fitxa. A diferència del catàleg, aquí els dos botons
   * conviuen: el primer permet repetir la dinàmica a la sessió (amb confirmació)
   * i el segon la treu.
   */
  function botons_sessio(d) {
    var vegades = TUT.store.vegades_a_sessio(d.id);
    return TUT.ui.boto_afegeix(d, vegades, 'boto--principal',
        ['Afegeix a la sessió', 'Ja és a la sessió']) +
      (vegades ? TUT.ui.boto_treu(d, '', 'Treu de la sessió') : '');
  }

  /** Repinta els botons de sessió i el distintiu del capçal després d'un canvi. */
  function refresca_sessio(contenidor, d) {
    TUT.app.actualitza_comptador();
    dom.$('#accions-sessio', contenidor).innerHTML = botons_sessio(d);
    dom.$('#marca-sessio', contenidor).innerHTML =
      TUT.ui.marca_sessio(TUT.store.vegades_a_sessio(d.id));
  }

  /**
   * Les activitats d'una unitat didàctica, o la unitat d'on surt una activitat.
   *
   * És el que fa navegable el Programa HEBE: una unitat és una proposta de
   * diverses sessions i cada activitat seva també es pot fer per separat.
   */
  function relacions(d) {
    var filles = TUT.data.filles(d);
    if (filles.length) {
      return '<section class="fitxa__seccio">' +
        '<h2 class="fitxa__etiqueta-seccio">Activitats de la unitat</h2>' +
        '<div class="graella" style="grid-template-columns:minmax(0,1fr)">' +
          filles.map(TUT.ui.fila).join('') +
        '</div>' +
      '</section>';
    }
    var pare = d.unitat ? TUT.data.obte(d.unitat) : null;
    if (!pare) return '';
    return '<section class="fitxa__seccio">' +
      '<h2 class="fitxa__etiqueta-seccio">Forma part de</h2>' +
      '<div class="graella" style="grid-template-columns:minmax(0,1fr)">' +
        TUT.ui.fila(pare) +
      '</div>' +
    '</section>';
  }

  function render(contenidor, id) {
    var d = TUT.data.obte(id);
    if (!d) {
      contenidor.innerHTML = '<a class="enllac-tornar" href="' + TUT.app.enllac_cataleg() +
        '">Torna al catàleg</a>' +
        '<div class="buit"><p>Aquesta proposta no existeix o s\'ha esborrat.</p></div>';
      return;
    }

    var seccions = SECCIONS.map(function (s) {
      if (!d[s[0]]) return '';
      return '<section class="fitxa__seccio">' +
        '<h2 class="fitxa__etiqueta-seccio">' + s[1] + '</h2>' +
        '<div class="fitxa__text">' + dom.paragrafs(d[s[0]]) + '</div>' +
      '</section>';
    }).join('');

    var etiquetes = d.etiquetes.map(function (t) {
      return '<a class="etiqueta" href="#/cataleg?eti=' + esc(t) + '">' +
        esc(TUT.data.nom_etiqueta(t)) + '</a>';
    }).join(' ');

    var temes = (d.temes || []).map(function (t) {
      return '<a class="etiqueta" href="#/cataleg?tem=' + esc(t) + '">' +
        esc(TUT.data.nom_tema(t)) + '</a>';
    }).join(' ');

    contenidor.innerHTML = '' +
      '<a class="enllac-tornar no-imprimir" href="' + TUT.app.enllac_cataleg() +
        '">Torna al catàleg</a>' +
      '<div class="vista__capcalera">' +
        '<div>' +
          '<div class="fila" style="margin-bottom:8px">' +
            '<a class="etiqueta etiqueta--tipus etiqueta--' + esc(d.tipus) +
              '" href="#/cataleg?tip=' + esc(d.tipus) + '">' +
              esc(TUT.data.nom_tipus(d.tipus)) + '</a>' +
            (TUT.data.familia_programa(d.categoria)
              ? '<a class="etiqueta etiqueta--categoria" href="#/cataleg?cat=' + esc(d.categoria) + '">' +
                esc(TUT.data.nom_categoria(d.categoria)) + '</a>' : '') +
            (d.nivells || []).map(function (n) {
              return '<a class="etiqueta etiqueta--nivell" href="#/cataleg?niv=' + esc(n) + '">' +
                esc(TUT.data.nom_nivell(n)) + '</a>';
            }).join('') +
            (d.origen !== 'cataleg'
              ? '<span class="etiqueta etiqueta--propia">' +
                (d.origen === 'propia' ? 'Pròpia' : 'Editada') + '</span>' : '') +
            '<span id="marca-sessio">' + TUT.ui.marca_sessio(TUT.store.vegades_a_sessio(d.id)) + '</span>' +
          '</div>' +
          '<h1 class="vista__titol">' + esc(d.titol) + '</h1>' +
        '</div>' +
        '<div class="vista__accions no-imprimir">' +
          '<span class="fila" id="accions-sessio">' + botons_sessio(d) + '</span>' +
          '<a class="boto" href="#/dinamica/' + esc(d.id) + '/edita">' +
            dom.icona('llapis') + 'Edita</a>' +
          '<button type="button" class="boto" data-duplica>' + dom.icona('copia') + 'Duplica</button>' +
          '<button type="button" class="boto" data-imprimeix>' + dom.icona('imprimir') + 'Imprimeix</button>' +
        '</div>' +
      '</div>' +

      '<div class="fitxa">' +
        '<div class="fitxa__cos">' + (seccions ||
          '<div class="fitxa__text">' + dom.paragrafs(d.descripcio) + '</div>') +
          relacions(d) + '</div>' +
        '<aside class="fitxa__lateral">' +
          '<dl class="propietats">' +
            '<dt>Durada</dt><dd>' + dom.minuts(d.durada) + '</dd>' +
            '<dt>Grup</dt><dd>' + esc(TUT.data.nom_grup(d.grup)) +
              (TUT.data.detall_grup(d.grup) ? ' <span class="tenue">(' +
                esc(TUT.data.detall_grup(d.grup)) + ')</span>' : '') + '</dd>' +
            '<dt>Nivell</dt><dd>' + ((d.nivells || []).length
              ? esc(d.nivells.map(TUT.data.nom_nivell).join(', '))
              : 'Qualsevol curs') + '</dd>' +
            (d.participants ? '<dt>Participants</dt><dd>' + esc(d.participants) + '</dd>' : '') +
            (d.espai ? '<dt>Espai</dt><dd>' + esc(d.espai) + '</dd>' : '') +
            '<dt>Material</dt><dd>' + (d.materials ? esc(d.materials) : 'No cal material') + '</dd>' +
          '</dl>' +
          (temes ? '<div style="margin-top:16px"><div class="fitxa__etiqueta-seccio">Temàtica</div>' +
            '<div class="etiquetes">' + temes + '</div></div>' : '') +
          (etiquetes ? '<div style="margin-top:16px"><div class="fitxa__etiqueta-seccio">Etiquetes</div>' +
            '<div class="etiquetes">' + etiquetes + '</div></div>' : '') +
          (d.font ? '<p class="petit tenue" style="margin-top:16px">Font: ' + esc(d.font) + '</p>' : '') +
          (d.es
            ? '<p class="petit tenue" style="margin-top:8px">' +
              (TUT.data.idioma() === 'ca'
                ? 'Text català traduït automàticament de l\'original castellà.'
                : 'Text original en castellà.') +
              ' <a href="#/bibliografia">Bibliografia</a></p>'
            : '') +
          (d.origen !== 'propia'
            ? '<p class="petit tenue" style="margin-top:12px">' +
              '<button type="button" class="boto boto--pla boto--petit" data-esborra>' +
              (d.origen === 'modificada' ? 'Desfés els canvis' : 'Amaga del catàleg') + '</button></p>'
            : '<p style="margin-top:12px">' +
              '<button type="button" class="boto boto--pla boto--petit boto--perill" data-esborra>' +
              'Esborra la proposta</button></p>') +
        '</aside>' +
      '</div>';

    /* Els botons de les fitxes relacionades porten el seu propi identificador;
       quan és un altre, cal repintar la fitxa sencera per refrescar-ne la fila. */
    dom.delega(contenidor, 'click', '[data-afegeix]', function (event, boto) {
      var quina = boto.dataset.afegeix;
      TUT.ui.afegeix_a_sessio(quina).then(function (afegida) {
        if (!afegida) return;
        if (quina === d.id) refresca_sessio(contenidor, d);
        else render(contenidor, d.id);
      });
    });

    dom.delega(contenidor, 'click', '[data-treu-sessio]', function (event, boto) {
      var quina = boto.dataset.treuSessio;
      if (!TUT.ui.treu_de_sessio(quina)) return;
      if (quina === d.id) refresca_sessio(contenidor, d);
      else render(contenidor, d.id);
    });

    dom.delega(contenidor, 'click', '[data-imprimeix]', function () { global.print(); });

    dom.delega(contenidor, 'click', '[data-duplica]', function () {
      var copia = Object.assign({}, d);
      delete copia.origen;
      delete copia._cerca;
      delete copia.es;     // la còpia és una dinàmica pròpia en una sola llengua
      copia.id = dom.identificador('d');
      copia.titol = d.titol + ' (còpia)';
      copia.font = d.font || '';
      TUT.store.desa_dinamica(copia);
      TUT.data.reconstrueix();
      TUT.ui.avis('Còpia creada. Ja la pots editar.');
      global.location.hash = '#/dinamica/' + copia.id + '/edita';
    });

    dom.delega(contenidor, 'click', '[data-esborra]', function () {
      var propia = d.origen === 'propia';
      var titol = propia ? 'Esborra la proposta'
        : (d.origen === 'modificada' ? 'Desfés els canvis' : 'Amaga la proposta');
      var missatge = propia
        ? 'S\'esborrarà definitivament del teu navegador. Aquesta acció no es pot desfer.'
        : (d.origen === 'modificada'
          ? 'Es recuperarà la versió original del catàleg.'
          : 'Deixarà de sortir a les cerques. La podràs recuperar des dels ajustos.');
      TUT.ui.confirma(titol, missatge, propia ? 'Esborra' : 'Continua').then(function (ok) {
        if (!ok) return;
        if (d.origen === 'modificada') TUT.store.restaura_dinamica(d.id);
        else TUT.store.esborra_dinamica(d.id, d.origen === 'cataleg');
        TUT.data.reconstrueix();
        global.location.hash = TUT.app.enllac_cataleg();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Formulari                                                           */
  /* ------------------------------------------------------------------ */

  function camp_text(nom, etiqueta, valor, ajuda) {
    return '<div><label for="c-' + nom + '">' + esc(etiqueta) + '</label>' +
      '<input type="text" id="c-' + nom + '" name="' + nom + '" value="' + esc(valor || '') + '">' +
      (ajuda ? '<p class="formulari__ajuda">' + esc(ajuda) + '</p>' : '') + '</div>';
  }

  function camp_area(nom, etiqueta, valor, ajuda, alt) {
    return '<div><label for="c-' + nom + '">' + esc(etiqueta) + '</label>' +
      '<textarea id="c-' + nom + '" name="' + nom + '"' +
        (alt ? ' style="min-height:' + alt + 'px"' : '') + '>' + esc(valor || '') + '</textarea>' +
      (ajuda ? '<p class="formulari__ajuda">' + esc(ajuda) + '</p>' : '') + '</div>';
  }

  function editor(contenidor, id) {
    var nova = !id || id === 'nova';
    var original = nova ? null : TUT.data.obte(id);
    if (!nova && !original) {
      contenidor.innerHTML = '<div class="buit"><p>Aquesta proposta no existeix.</p></div>';
      return;
    }
    var d = nova ? TUT.data.plantilla() : Object.assign({}, original);
    d.nivells = d.nivells || [];
    d.temes = d.temes || [];
    d.tipus = d.tipus || 'dinamica';
    var tax = TUT.data.taxonomia;

    contenidor.innerHTML = '' +
      '<a class="enllac-tornar" href="' +
        (nova ? TUT.app.enllac_cataleg() : '#/dinamica/' + esc(id)) + '">' +
        (nova ? 'Torna al catàleg' : 'Torna a la fitxa') + '</a>' +
      '<div class="vista__capcalera">' +
        '<div>' +
          '<h1 class="vista__titol">' + (nova ? 'Nova proposta' : 'Edita la proposta') + '</h1>' +
          '<p class="vista__descripcio">' + (nova
            ? 'La proposta es desa al teu navegador. Pots exportar-la des dels ajustos per compartir-la o afegir-la al repositori.'
            : 'Els canvis es desen al teu navegador i no afecten el catàleg original, que sempre pots recuperar.') +
          '</p>' +
        '</div>' +
      '</div>' +

      '<form class="formulari" id="formulari-dinamica" novalidate>' +
        camp_text('titol', 'Títol', d.titol) +

        '<div class="formulari__fila">' +
          '<div><label for="c-tipus">Tipus de proposta</label>' +
            '<select id="c-tipus" name="tipus">' +
              (tax.tipus || []).map(function (t) {
                return '<option value="' + esc(t.id) + '"' +
                  (t.id === d.tipus ? ' selected' : '') + '>' + esc(t.nom) + '</option>';
              }).join('') +
            '</select></div>' +
          '<div><label for="c-categoria">Categoria</label>' +
            '<select id="c-categoria" name="categoria">' +
              tax.categories.map(function (c) {
                return '<option value="' + esc(c.id) + '"' +
                  (c.id === d.categoria ? ' selected' : '') + '>' + esc(c.nom) + '</option>';
              }).join('') +
            '</select></div>' +
          '<div><label for="c-grup">Mida del grup</label>' +
            '<select id="c-grup" name="grup">' +
              tax.grups.map(function (g) {
                return '<option value="' + esc(g.id) + '"' +
                  (g.id === d.grup ? ' selected' : '') + '>' + esc(g.nom) +
                  (g.detall ? ' (' + esc(g.detall) + ')' : '') + '</option>';
              }).join('') +
            '</select></div>' +
          '<div><label for="c-durada">Durada (minuts)</label>' +
            '<input type="number" id="c-durada" name="durada" min="1" max="240" value="' +
              esc(d.durada) + '"></div>' +
        '</div>' +

        '<fieldset><legend>Nivell</legend>' +
          '<p class="formulari__ajuda">Deixa-ho tot sense marcar si serveix per a qualsevol curs.</p>' +
          '<div class="caselles" style="margin-top:8px">' +
          (tax.nivells || []).map(function (n) {
            return '<label class="casella"><input type="checkbox" name="nivells" value="' +
              esc(n.id) + '"' + (d.nivells.indexOf(n.id) >= 0 ? ' checked' : '') + '>' +
              esc(n.nom) + '</label>';
          }).join('') +
        '</div></fieldset>' +

        '<fieldset><legend>Temàtica</legend>' +
          '<p class="formulari__ajuda">De què tracta la proposta o per a què serveix. Marca\'n almenys un perquè surti quan es filtra per temàtica.</p>' +
          '<div class="caselles" style="margin-top:8px">' +
          (tax.temes || []).map(function (t) {
            return '<label class="casella"><input type="checkbox" name="temes" value="' +
              esc(t.id) + '"' + (d.temes.indexOf(t.id) >= 0 ? ' checked' : '') + '>' +
              esc(t.nom) + '</label>';
          }).join('') +
        '</div></fieldset>' +

        '<fieldset><legend>Etiquetes</legend><div class="caselles" style="margin-top:8px">' +
          tax.etiquetes.map(function (t) {
            return '<label class="casella"><input type="checkbox" name="etiquetes" value="' +
              esc(t.id) + '"' + (d.etiquetes.indexOf(t.id) >= 0 ? ' checked' : '') + '>' +
              esc(t.nom) + '</label>';
          }).join('') +
        '</div></fieldset>' +

        camp_text('materials', 'Material necessari', d.materials, 'Deixa-ho buit si no cal material.') +

        '<div class="formulari__fila">' +
          camp_text('participants', 'Participants', d.participants, 'Per exemple: a partir de 12 anys.') +
          camp_text('espai', 'Espai', d.espai, 'Aula, pati, gimnàs…') +
        '</div>' +

        camp_area('resum', 'En què consisteix', d.resum, 'Una o dues frases que resumeixin la dinàmica.', 70) +
        camp_area('objectius', 'Objectius', d.objectius) +
        camp_area('preparacio', 'Preparació', d.preparacio) +
        camp_area('consignes', 'Consignes de partida', d.consignes) +
        camp_area('descripcio', 'Desenvolupament', d.descripcio, 'Separa els paràgrafs amb una línia en blanc.', 220) +
        camp_area('avaluacio', 'Avaluació i reflexió', d.avaluacio) +
        camp_area('notes', 'Observacions i variants', d.notes) +
        camp_text('font', 'Font', d.font, 'Referència d\'on prové la dinàmica, si escau.') +

        '<div class="fila" style="margin-top:8px">' +
          '<button type="submit" class="boto boto--principal">Desa la proposta</button>' +
          '<a class="boto" href="' +
            (nova ? TUT.app.enllac_cataleg() : '#/dinamica/' + esc(id)) + '">Cancel·la</a>' +
        '</div>' +
      '</form>';

    dom.$('#formulari-dinamica', contenidor).addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var dades = new FormData(form);
      var titol = String(dades.get('titol') || '').trim();
      var descripcio = String(dades.get('descripcio') || '').trim();

      if (!titol) {
        TUT.ui.avis('Cal un títol per desar la proposta.');
        dom.$('#c-titol', form).focus();
        return;
      }
      if (!descripcio) {
        TUT.ui.avis('Cal explicar el desenvolupament de la proposta.');
        dom.$('#c-descripcio', form).focus();
        return;
      }

      var resultat = {
        id: nova ? dom.identificador('d') : d.id,
        titol: titol,
        tipus: String(dades.get('tipus') || 'dinamica'),
        categoria: String(dades.get('categoria')),
        grup: String(dades.get('grup')),
        durada: Math.max(1, Number(dades.get('durada')) || 15),
        etiquetes: dades.getAll('etiquetes'),
        nivells: dades.getAll('nivells'),
        temes: dades.getAll('temes'),
        descripcio: descripcio,
      };
      /* Els vincles entre unitat i activitats no s'editen des del formulari,
         però s'han de conservar en desar la fitxa. */
      if (d.unitat) resultat.unitat = d.unitat;

      if (d.activitats && d.activitats.length) resultat.activitats = d.activitats.slice();
      ['materials', 'participants', 'espai', 'resum', 'objectius', 'preparacio',
        'consignes', 'avaluacio', 'notes', 'font'].forEach(function (camp) {
        var valor = String(dades.get(camp) || '').trim();
        if (valor) resultat[camp] = valor;
      });

      TUT.store.desa_dinamica(resultat);
      TUT.data.reconstrueix();
      TUT.ui.avis(nova ? 'Proposta creada.' : 'Canvis desats.');
      global.location.hash = '#/dinamica/' + resultat.id;
    });
  }

  TUT.dinamica = { render: render, editor: editor };
})(window);
