/* imprimir.js - full de sessió imprimible i exportable a PDF des del navegador. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  var CAMPS = [
    ['objectius', 'objectius', 'Objectius'],
    ['materials', 'materials', 'Material'],
    ['preparacio', 'preparacio', 'Preparació'],
    ['desenvolupament', 'descripcio', 'Desenvolupament'],
    ['avaluacio', 'avaluacio', 'Avaluació i reflexió'],
    ['notes', 'notes', 'Observacions i variants'],
  ];

  function opcions_html(opcions) {
    return '<div class="caselles">' + CAMPS.map(function (c) {
      return '<label class="casella"><input type="checkbox" data-opcio="' + c[0] + '"' +
        (opcions[c[0]] ? ' checked' : '') + '>' + esc(c[2]) + '</label>';
    }).join('') +
      '<label class="casella"><input type="checkbox" data-opcio="signatura"' +
      (opcions.signatura ? ' checked' : '') + '>Espai per a signatures</label>' +
    '</div>';
  }

  function bloc_html(bloc, inici, opcions) {
    var d = bloc.tipus === 'dinamica' ? TUT.data.obte(bloc.dinamica) : null;
    var camps = '';

    if (d) {
      if (d.resum) {
        camps += '<div class="full__camp"><div class="full__camp-nom">En què consisteix</div>' +
          dom.paragrafs(d.resum) + '</div>';
      }
      CAMPS.forEach(function (c) {
        if (!opcions[c[0]] || !d[c[1]]) return;
        camps += '<div class="full__camp"><div class="full__camp-nom">' + c[2] + '</div>' +
          dom.paragrafs(d[c[1]]) + '</div>';
      });
    }

    if (bloc.notes) {
      camps += '<div class="full__camp"><div class="full__camp-nom">Notes del tutor</div>' +
        dom.paragrafs(bloc.notes) + '</div>';
    }

    return '<section class="full__bloc">' +
      '<div class="full__bloc-capcalera">' +
        '<span class="full__bloc-hora">' + esc(inici ? inici + ' · ' : '') +
          dom.minuts(bloc.durada) + '</span>' +
        '<span class="full__bloc-titol">' + esc(bloc.titol) + '</span>' +
      '</div>' +
      (d ? '<p class="petit tenue" style="margin:0 0 4px">' +
        [TUT.data.nom_tipus(d.tipus), TUT.data.classificacio(d).nom,
          TUT.data.nom_grup(d.grup),
          d.materials ? 'Material: ' + d.materials : 'Sense material']
          .map(esc).join(' · ') + '</p>' : '') +
      camps +
    '</section>';
  }

  function full_html(s, opcions) {
    var prefs = TUT.store.estat.preferencies;
    var total = TUT.sessions.durada_total(s);
    var hora = s.hora_inici;

    var dades = [
      ['Grup', [s.nivell ? TUT.sessions.nom_nivell(s.nivell) : '', s.grup].filter(Boolean).join(' · ')],
      ['Data', dom.data_llarga(s.data)],
      ['Horari', s.hora_inici ? s.hora_inici + ' - ' + dom.suma_hora(s.hora_inici, total) : ''],
      ['Durada', dom.minuts(total)],
      ['Tutor/a', s.tutor],
    ].filter(function (d) { return d[1]; });

    return '<article class="full-imprimible">' +
      '<header class="full__capcalera">' +
        (prefs.centre ? '<div class="full__centre">' + esc(prefs.centre) + '</div>' : '') +
        '<h1>' + esc(s.titol) + '</h1>' +
        (dades.length ? '<dl class="full__dades">' + dades.map(function (d) {
          return '<div class="full__dada"><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>';
        }).join('') + '</dl>' : '') +
      '</header>' +

      (s.objectius ? '<section class="full__camp" style="margin-bottom:16px">' +
        '<div class="full__camp-nom">Objectius de la sessió</div>' +
        dom.paragrafs(s.objectius) + '</section>' : '') +

      (s.blocs.length
        ? s.blocs.map(function (b) {
            var inici = hora;
            hora = dom.suma_hora(hora, Number(b.durada) || 0);
            return bloc_html(b, inici, opcions);
          }).join('')
        : '<p class="tenue">La sessió encara no té cap bloc.</p>') +

      (s.observacions ? '<section class="full__bloc">' +
        '<div class="full__camp-nom">Observacions</div>' +
        dom.paragrafs(s.observacions) + '</section>' : '') +

      (opcions.signatura ? '<div class="full__signatura">' +
        '<div class="full__linia-signatura">Signatura del tutor o tutora</div>' +
        '<div class="full__linia-signatura">Vist i plau de la coordinació</div>' +
      '</div>' : '') +

      '<footer class="full__peu">' +
        esc(s.titol) + (prefs.centre ? ' · ' + esc(prefs.centre) : '') +
        ' · Generat amb Tutoria' +
      '</footer>' +
    '</article>';
  }

  function render(contenidor, id) {
    var s = TUT.store.sessio(id);
    if (!s) {
      contenidor.innerHTML = '<div class="buit"><p>Aquesta sessió no existeix.</p></div>';
      return;
    }
    var opcions = Object.assign({}, TUT.store.estat.preferencies.impressio);

    function pinta() {
      dom.$('#full', contenidor).innerHTML = full_html(s, opcions);
    }

    contenidor.innerHTML = '' +
      '<a class="enllac-tornar no-imprimir" href="#/sessio/' + esc(s.id) + '">Torna a la sessió</a>' +
      '<div class="vista__capcalera no-imprimir">' +
        '<div>' +
          '<h1 class="vista__titol">Full de sessió</h1>' +
          '<p class="vista__descripcio">Tria què vols que aparegui al full i imprimeix-lo. ' +
            'Al diàleg d\'impressió pots escollir «Desa com a PDF» com a destinació.</p>' +
        '</div>' +
        '<div class="vista__accions">' +
          '<button type="button" class="boto boto--principal" id="imprimeix">' +
            dom.icona('imprimir') + 'Imprimeix o desa en PDF</button>' +
        '</div>' +
      '</div>' +
      '<fieldset class="no-imprimir" style="margin-bottom:28px">' +
        '<legend>Contingut del full</legend>' +
        '<div style="margin-top:10px">' + opcions_html(opcions) + '</div>' +
      '</fieldset>' +
      '<div id="full"></div>';

    pinta();

    dom.$('#imprimeix', contenidor).addEventListener('click', function () { global.print(); });

    contenidor.addEventListener('change', function (event) {
      var casella = event.target.closest('[data-opcio]');
      if (!casella) return;
      opcions[casella.dataset.opcio] = casella.checked;
      TUT.store.actualitza_impressio(opcions);
      pinta();
    });
  }

  TUT.imprimir = { render: render };
})(window);
