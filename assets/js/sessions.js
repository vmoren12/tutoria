/* sessions.js - llista de sessions i constructor d'una sessió de tutoria. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  function durada_total(s) {
    return s.blocs.reduce(function (suma, b) { return suma + (Number(b.durada) || 0); }, 0);
  }

  /* ------------------------------------------------------------------ */
  /* Llista de sessions                                                  */
  /* ------------------------------------------------------------------ */

  function llista(contenidor) {
    var sessions = TUT.store.estat.sessions;
    var activa = TUT.store.sessio_activa();

    var cos = sessions.length
      ? '<ul class="llista-sessions">' + sessions.map(function (s) {
          var es_activa = activa && activa.id === s.id;
          return '<li class="element-sessio' + (es_activa ? ' element-sessio--activa' : '') + '">' +
            '<div class="creix">' +
              '<div class="element-sessio__titol">' +
                '<a href="#/sessio/' + esc(s.id) + '">' + esc(s.titol) + '</a>' +
                (es_activa ? ' <span class="etiqueta">Activa</span>' : '') +
              '</div>' +
              '<div class="petit tenue">' +
                [s.nivell ? nom_nivell(s.nivell) : '', s.grup, dom.data_llarga(s.data),
                  s.blocs.length + (s.blocs.length === 1 ? ' bloc' : ' blocs'),
                  dom.minuts(durada_total(s))].filter(Boolean).map(esc).join(' · ') +
              '</div>' +
            '</div>' +
            '<div class="element-sessio__accions">' +
              (es_activa ? '' : '<button type="button" class="boto boto--petit" data-activa="' +
                esc(s.id) + '">Fes-la activa</button>') +
              '<a class="boto boto--petit" href="#/sessio/' + esc(s.id) + '/impressio">' +
                dom.icona('imprimir') + 'Full</a>' +
              '<button type="button" class="boto boto--petit" data-duplica="' + esc(s.id) + '">' +
                dom.icona('copia') + '</button>' +
              '<button type="button" class="boto boto--petit boto--perill" data-esborra="' +
                esc(s.id) + '">' + dom.icona('paperera') + '</button>' +
            '</div>' +
          '</li>';
        }).join('') + '</ul>'
      : '<div class="buit"><p>Encara no has creat cap sessió.</p>' +
        '<button type="button" class="boto boto--principal" data-nova>Crea la primera sessió</button></div>';

    contenidor.innerHTML =
      '<div class="vista__capcalera">' +
        '<div>' +
          '<h1 class="vista__titol">Sessions</h1>' +
          '<p class="vista__descripcio">Cada sessió és una seqüència de dinàmiques i blocs ' +
            'amb temps assignat, llesta per imprimir o desar en PDF.</p>' +
        '</div>' +
        '<div class="vista__accions">' +
          '<button type="button" class="boto boto--principal" data-nova>' +
            dom.icona('mes') + 'Nova sessió</button>' +
        '</div>' +
      '</div>' + cos;

    dom.delega(contenidor, 'click', '[data-nova]', function () {
      var s = TUT.store.nova_sessio();
      global.location.hash = '#/sessio/' + s.id;
    });

    dom.delega(contenidor, 'click', '[data-activa]', function (event, boto) {
      TUT.store.activa_sessio(boto.dataset.activa);
      TUT.app.encamina();
    });

    dom.delega(contenidor, 'click', '[data-duplica]', function (event, boto) {
      var copia = TUT.store.duplica_sessio(boto.dataset.duplica);
      if (copia) global.location.hash = '#/sessio/' + copia.id;
    });

    dom.delega(contenidor, 'click', '[data-esborra]', function (event, boto) {
      var s = TUT.store.sessio(boto.dataset.esborra);
      if (!s) return;
      TUT.ui.confirma('Esborra la sessió', 'S\'esborrarà «' + s.titol +
        '». Aquesta acció no es pot desfer.', 'Esborra').then(function (ok) {
        if (!ok) return;
        TUT.store.esborra_sessio(s.id);
        TUT.app.encamina();
      });
    });
  }

  function nom_nivell(id) {
    var n = TUT.data.taxonomia.nivells || [];
    for (var i = 0; i < n.length; i++) if (n[i].id === id) return n[i].nom;
    return id;
  }

  /* ------------------------------------------------------------------ */
  /* Constructor de sessió                                               */
  /* ------------------------------------------------------------------ */

  function blocs_html(s) {
    if (!s.blocs.length) {
      return '<div class="buit"><p>La sessió encara no té cap bloc.</p>' +
        '<div class="fila" style="justify-content:center;margin-top:12px">' +
        '<a class="boto boto--principal" href="#/cataleg">Cerca dinàmiques</a>' +
        '<button type="button" class="boto" data-afegeix-nota>Afegeix un bloc lliure</button>' +
        '</div></div>';
    }

    var hora = s.hora_inici;
    return '<ul class="blocs">' + s.blocs.map(function (b, i) {
      var inici = hora;
      hora = dom.suma_hora(hora, Number(b.durada) || 0);
      var enllac = b.tipus === 'dinamica' && TUT.data.obte(b.dinamica);

      return '<li class="bloc" data-bloc="' + esc(b.id) + '">' +
        '<div class="bloc__hora">' + (inici ? esc(inici) : String(i + 1)) + '</div>' +
        '<div>' +
          '<div class="bloc__titol">' +
            (enllac ? '<a href="#/dinamica/' + esc(b.dinamica) + '">' + esc(b.titol) + '</a>'
                    : esc(b.titol)) +
          '</div>' +
          '<div class="petit tenue">' +
            (b.tipus === 'dinamica'
              ? (enllac ? esc(TUT.data.nom_categoria(enllac.categoria)) : 'Dinàmica no disponible')
              : 'Bloc lliure') + '</div>' +
          '<textarea class="bloc__notes" data-notes rows="2" ' +
            'placeholder="Notes per a aquest bloc (materials, agrupaments, avisos…)">' +
            esc(b.notes || '') + '</textarea>' +
        '</div>' +
        '<div class="bloc__accions">' +
          '<input type="number" class="bloc__durada" data-durada min="1" max="240" value="' +
            esc(b.durada) + '" aria-label="Durada en minuts">' +
          '<button type="button" class="boto boto--pla boto--petit" data-mou="-1" ' +
            'aria-label="Mou amunt"' + (i === 0 ? ' disabled' : '') + '>' + dom.icona('amunt') + '</button>' +
          '<button type="button" class="boto boto--pla boto--petit" data-mou="1" ' +
            'aria-label="Mou avall"' + (i === s.blocs.length - 1 ? ' disabled' : '') + '>' +
            dom.icona('avall') + '</button>' +
          '<button type="button" class="boto boto--pla boto--petit" data-treu ' +
            'aria-label="Treu el bloc">' + dom.icona('creu') + '</button>' +
        '</div>' +
      '</li>';
    }).join('') + '</ul>' +
    '<div class="fila" style="margin-top:16px">' +
      '<a class="boto" href="#/cataleg">' + dom.icona('mes') + 'Afegeix dinàmiques</a>' +
      '<button type="button" class="boto" data-afegeix-nota>' + dom.icona('mes') + 'Bloc lliure</button>' +
    '</div>';
  }

  function lateral_html(s) {
    var total = durada_total(s);
    var previst = Number(s.durada_prevista) || 0;
    var percentatge = previst ? Math.min(100, Math.round((total / previst) * 100)) : 0;
    var excedit = previst && total > previst;

    return '<div class="fitxa__lateral resum-sessio">' +
      '<div>' +
        '<div class="fitxa__etiqueta-seccio">Temps programat</div>' +
        '<div class="resum-sessio__xifra">' + dom.minuts(total) + '</div>' +
      '</div>' +
      (previst
        ? '<div>' +
            '<div class="barra-temps"><div class="barra-temps__ple' +
              (excedit ? ' barra-temps__ple--excedit' : '') +
              '" style="width:' + percentatge + '%"></div></div>' +
            '<p class="petit ' + (excedit ? '' : 'tenue') + '" style="margin-top:6px">' +
              (excedit
                ? 'Excedeix en ' + dom.minuts(total - previst) + ' la durada prevista.'
                : 'Queden ' + dom.minuts(previst - total) + ' de ' + dom.minuts(previst) + '.') +
            '</p>' +
          '</div>'
        : '') +
      '<hr style="margin:4px 0">' +
      '<dl class="propietats">' +
        '<dt>Blocs</dt><dd>' + s.blocs.length + '</dd>' +
        (s.hora_inici ? '<dt>Horari</dt><dd>' + esc(s.hora_inici) + ' - ' +
          esc(dom.suma_hora(s.hora_inici, total)) + '</dd>' : '') +
        (s.data ? '<dt>Data</dt><dd>' + esc(dom.data_llarga(s.data)) + '</dd>' : '') +
      '</dl>' +
      '<a class="boto boto--principal" href="#/sessio/' + esc(s.id) + '/impressio">' +
        dom.icona('imprimir') + 'Full de sessió</a>' +
    '</div>';
  }

  function detall(contenidor, id) {
    var s = TUT.store.sessio(id);
    if (!s) {
      contenidor.innerHTML = '<a class="enllac-tornar" href="#/sessions">Torna a les sessions</a>' +
        '<div class="buit"><p>Aquesta sessió no existeix.</p></div>';
      return;
    }
    var tax = TUT.data.taxonomia;

    function pinta_blocs() {
      dom.$('#blocs', contenidor).innerHTML = blocs_html(s);
      dom.$('#lateral', contenidor).innerHTML = lateral_html(s);
      TUT.app.actualitza_comptador();
    }

    contenidor.innerHTML = '' +
      '<a class="enllac-tornar" href="#/sessions">Torna a les sessions</a>' +
      '<div class="vista__capcalera">' +
        '<div><h1 class="vista__titol">Sessió de tutoria</h1>' +
          '<p class="vista__descripcio">Ajusta les dades de la sessió, ordena els blocs ' +
            'i reparteix el temps. Tot es desa automàticament.</p></div>' +
        '<div class="vista__accions">' +
          '<button type="button" class="boto" data-duplica>' + dom.icona('copia') + 'Duplica</button>' +
          '<a class="boto boto--principal" href="#/sessio/' + esc(s.id) + '/impressio">' +
            dom.icona('imprimir') + 'Full de sessió</a>' +
        '</div>' +
      '</div>' +

      '<form id="dades-sessio" class="formulari" style="max-width:none;margin-bottom:32px">' +
        '<div class="formulari__fila">' +
          '<div style="grid-column:span 2"><label for="s-titol">Títol de la sessió</label>' +
            '<input type="text" id="s-titol" name="titol" value="' + esc(s.titol) + '"></div>' +
          '<div><label for="s-nivell">Nivell</label><select id="s-nivell" name="nivell">' +
            '<option value="">Sense especificar</option>' +
            (tax.nivells || []).map(function (n) {
              return '<option value="' + esc(n.id) + '"' + (n.id === s.nivell ? ' selected' : '') +
                '>' + esc(n.nom) + '</option>';
            }).join('') + '</select></div>' +
          '<div><label for="s-grup">Grup classe</label>' +
            '<input type="text" id="s-grup" name="grup" value="' + esc(s.grup) +
            '" placeholder="Per exemple: 2n B"></div>' +
        '</div>' +
        '<div class="formulari__fila">' +
          '<div><label for="s-data">Data</label>' +
            '<input type="date" id="s-data" name="data" value="' + esc(s.data) + '"></div>' +
          '<div><label for="s-hora">Hora d\'inici</label>' +
            '<input type="text" id="s-hora" name="hora_inici" value="' + esc(s.hora_inici) +
            '" placeholder="09:00" inputmode="numeric"></div>' +
          '<div><label for="s-durada">Durada prevista (min)</label>' +
            '<input type="number" id="s-durada" name="durada_prevista" min="0" max="480" value="' +
            esc(s.durada_prevista) + '"></div>' +
          '<div><label for="s-tutor">Tutor o tutora</label>' +
            '<input type="text" id="s-tutor" name="tutor" value="' + esc(s.tutor) + '"></div>' +
        '</div>' +
        '<div class="formulari__fila">' +
          '<div><label for="s-objectius">Objectius de la sessió</label>' +
            '<textarea id="s-objectius" name="objectius">' + esc(s.objectius) + '</textarea></div>' +
          '<div><label for="s-observacions">Observacions</label>' +
            '<textarea id="s-observacions" name="observacions">' + esc(s.observacions) + '</textarea></div>' +
        '</div>' +
      '</form>' +

      '<div class="sessio">' +
        '<div><h2 style="margin-bottom:12px">Seqüència</h2><div id="blocs"></div></div>' +
        '<div id="lateral"></div>' +
      '</div>';

    pinta_blocs();

    dom.$('#dades-sessio', contenidor).addEventListener('input', function (event) {
      var camp = event.target;
      var valor = camp.type === 'number' ? Number(camp.value) : camp.value;
      TUT.store.actualitza_sessio(s.id, (function () {
        var o = {}; o[camp.name] = valor; return o;
      })());
      if (camp.name === 'hora_inici' || camp.name === 'durada_prevista' ||
          camp.name === 'data') pinta_blocs();
    });

    dom.delega(contenidor, 'click', '[data-duplica]', function () {
      var copia = TUT.store.duplica_sessio(s.id);
      if (copia) global.location.hash = '#/sessio/' + copia.id;
    });

    dom.delega(contenidor, 'click', '[data-afegeix-nota]', function () {
      TUT.store.afegeix_bloc(s.id, {
        tipus: 'nota', titol: 'Bloc lliure', durada: 5, notes: '',
      });
      pinta_blocs();
    });

    dom.delega(contenidor, 'click', '[data-mou]', function (event, boto) {
      var li = boto.closest('[data-bloc]');
      TUT.store.mou_bloc(s.id, li.dataset.bloc, Number(boto.dataset.mou));
      pinta_blocs();
    });

    dom.delega(contenidor, 'click', '[data-treu]', function (event, boto) {
      var li = boto.closest('[data-bloc]');
      TUT.store.treu_bloc(s.id, li.dataset.bloc);
      pinta_blocs();
    });

    dom.$('#blocs', contenidor).addEventListener('input', function (event) {
      var camp = event.target;
      var li = camp.closest('[data-bloc]');
      if (!li) return;
      if (camp.hasAttribute('data-durada')) {
        TUT.store.actualitza_bloc(s.id, li.dataset.bloc,
          { durada: Math.max(1, Number(camp.value) || 1) });
        dom.$('#lateral', contenidor).innerHTML = lateral_html(s);
        actualitza_hores(s);
      } else if (camp.hasAttribute('data-notes')) {
        TUT.store.actualitza_bloc(s.id, li.dataset.bloc, { notes: camp.value });
      }
    });

    dom.$('#blocs', contenidor).addEventListener('dblclick', function (event) {
      var titol = event.target.closest('.bloc__titol');
      var li = titol && titol.closest('[data-bloc]');
      if (!li) return;
      var bloc = s.blocs.filter(function (b) { return b.id === li.dataset.bloc; })[0];
      if (!bloc || bloc.tipus !== 'nota') return;
      var nou = global.prompt('Títol del bloc', bloc.titol);
      if (nou !== null && nou.trim()) {
        TUT.store.actualitza_bloc(s.id, bloc.id, { titol: nou.trim() });
        pinta_blocs();
      }
    });

    /** Recalcula les hores sense repintar (evita perdre el focus). */
    function actualitza_hores(sessio) {
      var hora = sessio.hora_inici;
      dom.$$('[data-bloc]', contenidor).forEach(function (li, i) {
        var bloc = sessio.blocs[i];
        dom.$('.bloc__hora', li).textContent = hora || String(i + 1);
        hora = dom.suma_hora(hora, Number(bloc.durada) || 0);
      });
    }
  }

  TUT.sessions = { llista: llista, detall: detall, durada_total: durada_total, nom_nivell: nom_nivell };
})(window);
