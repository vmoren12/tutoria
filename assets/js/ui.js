/* ui.js - peces d'interfície compartides: targetes, avisos i diàlegs. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  var temporitzador_avis = null;

  /** Missatge breu a la part inferior de la pantalla. */
  function avis(text) {
    var caixa = dom.$('#avis');
    if (!caixa) return;
    caixa.textContent = text;
    caixa.hidden = false;
    clearTimeout(temporitzador_avis);
    temporitzador_avis = setTimeout(function () { caixa.hidden = true; }, 2600);
  }

  /** Diàleg de confirmació. Retorna una promesa amb true o false. */
  function confirma(titol, missatge, etiqueta_accio) {
    return new Promise(function (resol) {
      var caixa = document.createElement('div');
      caixa.className = 'dialeg';
      caixa.innerHTML =
        '<div class="dialeg__caixa" role="dialog" aria-modal="true" aria-label="' + esc(titol) + '">' +
          '<h2>' + esc(titol) + '</h2>' +
          '<p class="suau" style="margin-top:8px">' + esc(missatge) + '</p>' +
          '<div class="dialeg__accions">' +
            '<button type="button" class="boto" data-accio="cancella">Cancel·la</button>' +
            '<button type="button" class="boto boto--principal" data-accio="confirma">' +
              esc(etiqueta_accio || 'Confirma') + '</button>' +
          '</div>' +
        '</div>';

      function tanca(resultat) {
        caixa.remove();
        document.removeEventListener('keydown', tecla);
        resol(resultat);
      }
      function tecla(event) {
        if (event.key === 'Escape') tanca(false);
      }

      caixa.addEventListener('click', function (event) {
        if (event.target === caixa) return tanca(false);
        var boto = event.target.closest('[data-accio]');
        if (boto) tanca(boto.dataset.accio === 'confirma');
      });
      document.addEventListener('keydown', tecla);
      document.body.appendChild(caixa);
      caixa.querySelector('[data-accio="confirma"]').focus();
    });
  }

  /** Text curt de resum d'una dinàmica per a les targetes. */
  function extracte(d, longitud) {
    var text = (d.resum || d.objectius || d.descripcio || '').replace(/\s+/g, ' ').trim();
    longitud = longitud || 180;
    return text.length > longitud ? text.slice(0, longitud).replace(/\s\S*$/, '') + '…' : text;
  }

  function marca_origen(d) {
    if (d.origen === 'propia') return '<span class="etiqueta etiqueta--propia">Pròpia</span>';
    if (d.origen === 'modificada') return '<span class="etiqueta etiqueta--propia">Editada</span>';
    return '';
  }

  /** Targeta de dinàmica per al catàleg. */
  function targeta(d) {
    var etiquetes = d.etiquetes.slice(0, 3).map(function (t) {
      return '<span class="etiqueta">' + esc(TUT.data.nom_etiqueta(t)) + '</span>';
    }).join('');
    var extra = d.etiquetes.length > 3
      ? '<span class="etiqueta">+' + (d.etiquetes.length - 3) + '</span>' : '';

    return '<article class="targeta">' +
      '<div class="fila" style="gap:6px">' +
        '<span class="etiqueta etiqueta--categoria">' + esc(TUT.data.nom_categoria(d.categoria)) + '</span>' +
        marca_origen(d) +
      '</div>' +
      '<h3 class="targeta__titol"><a href="#/dinamica/' + esc(d.id) + '">' + esc(d.titol) + '</a></h3>' +
      '<div class="targeta__meta">' +
        '<span>' + dom.icona('rellotge') + dom.minuts(d.durada) + '</span>' +
        '<span>' + dom.icona('grup') + esc(TUT.data.nom_grup(d.grup)) + '</span>' +
        (d.materials ? '<span>' + dom.icona('caixa') + 'Amb material</span>' : '') +
      '</div>' +
      '<p class="targeta__resum">' + esc(extracte(d)) + '</p>' +
      '<div class="targeta__peu">' +
        '<div class="etiquetes creix">' + etiquetes + extra + '</div>' +
        '<button type="button" class="boto boto--petit" data-afegeix="' + esc(d.id) + '">' +
          dom.icona('mes') + 'Afegeix</button>' +
      '</div>' +
    '</article>';
  }

  /** Fila compacta de dinàmica (vista de llista). */
  function fila(d) {
    return '<article class="targeta" style="flex-direction:row;align-items:center;gap:16px">' +
      '<div class="creix">' +
        '<h3 class="targeta__titol"><a href="#/dinamica/' + esc(d.id) + '">' + esc(d.titol) + '</a></h3>' +
        '<div class="targeta__meta" style="margin-top:4px">' +
          '<span class="etiqueta etiqueta--categoria">' + esc(TUT.data.nom_categoria(d.categoria)) + '</span>' +
          '<span>' + dom.icona('rellotge') + dom.minuts(d.durada) + '</span>' +
          '<span>' + dom.icona('grup') + esc(TUT.data.nom_grup(d.grup)) + '</span>' +
          (d.materials ? '<span>' + dom.icona('caixa') + 'Amb material</span>' : '') +
          marca_origen(d) +
        '</div>' +
      '</div>' +
      '<button type="button" class="boto boto--petit" data-afegeix="' + esc(d.id) + '">' +
        dom.icona('mes') + 'Afegeix</button>' +
    '</article>';
  }

  /** Afegeix una dinàmica a la sessió activa (creant-ne una si cal). */
  function afegeix_a_sessio(id) {
    var d = TUT.data.obte(id);
    if (!d) return;
    var s = TUT.store.sessio_activa();
    if (!s) s = TUT.store.nova_sessio();
    TUT.store.afegeix_bloc(s.id, {
      tipus: 'dinamica',
      dinamica: d.id,
      titol: d.titol,
      durada: d.durada,
    });
    avis('«' + d.titol + '» afegida a «' + s.titol + '».');
  }

  TUT.ui = {
    avis: avis,
    confirma: confirma,
    extracte: extracte,
    targeta: targeta,
    fila: fila,
    afegeix_a_sessio: afegeix_a_sessio,
  };
})(window);
