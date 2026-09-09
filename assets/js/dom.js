/* dom.js - utilitats mínimes de DOM i de text. Sense dependències. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});

  /** Escapa text per interpolar-lo dins d'HTML. */
  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Converteix text pla amb salts de línia en paràgrafs HTML. */
  function paragrafs(text) {
    if (!text) return '';
    return String(text)
      .split(/\n{2,}/)
      .map(function (p) {
        return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
      })
      .join('');
  }

  /** Normalitza per a cerques: minúscules i sense accents. */
  function normalitza(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function $(selector, arrel) {
    return (arrel || document).querySelector(selector);
  }

  function $$(selector, arrel) {
    return Array.prototype.slice.call((arrel || document).querySelectorAll(selector));
  }

  /** Delegació d'esdeveniments a partir d'un selector. */
  function delega(arrel, tipus, selector, gestor) {
    arrel.addEventListener(tipus, function (event) {
      var objectiu = event.target.closest(selector);
      if (objectiu && arrel.contains(objectiu)) gestor(event, objectiu);
    });
  }

  /** Format "1 h 15 min" a partir de minuts. */
  function minuts(total) {
    total = Math.max(0, Math.round(total || 0));
    if (total < 60) return total + ' min';
    var h = Math.floor(total / 60);
    var m = total % 60;
    return m ? h + ' h ' + m + ' min' : h + ' h';
  }

  /** Suma minuts a una hora "HH:MM" i retorna "HH:MM". */
  function suma_hora(hora, afegir) {
    var parts = /^(\d{1,2}):(\d{2})$/.exec(hora || '');
    if (!parts) return '';
    var total = (Number(parts[1]) * 60 + Number(parts[2]) + afegir) % 1440;
    if (total < 0) total += 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
      String(total % 60).padStart(2, '0');
  }

  function data_llarga(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function identificador(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7);
  }

  /** Icones SVG en línia (traç, sense emojis). */
  var CAMINS = {
    cerca: '<circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/>',
    mes: '<path d="M8 3v10M3 8h10"/>',
    menys: '<path d="M3 8h10"/>',
    amunt: '<path d="M8 13V3M4 7l4-4 4 4"/>',
    avall: '<path d="M8 3v10M4 9l4 4 4-4"/>',
    creu: '<path d="M4 4l8 8M12 4l-8 8"/>',
    imprimir: '<path d="M4 6V2h8v4"/><path d="M4 12H2V6h12v6h-2"/><path d="M4 10h8v4H4z"/>',
    llapis: '<path d="M11 2l3 3-8 8-4 1 1-4z"/>',
    copia: '<path d="M5 5V2h9v9h-3"/><path d="M2 5h9v9H2z"/>',
    paperera: '<path d="M3 4h10M6 4V2h4v2M5 4l1 10h4l1-10"/>',
    fletxa: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    rellotge: '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>',
    grup: '<circle cx="6" cy="6" r="2.5"/><path d="M2 14c0-2.2 1.8-4 4-4s4 1.8 4 4"/><path d="M11 4.2a2.5 2.5 0 010 4.6M12.5 14c0-1.6-.6-3-1.6-4"/>',
    caixa: '<path d="M2 5l6-3 6 3-6 3z"/><path d="M2 5v6l6 3 6-3V5"/>',
    vist: '<path d="M3 8.5l3.5 3.5L13 5"/>',
    llibre: '<path d="M2 3h4.5c.8 0 1.5.7 1.5 1.5V13c0-.8-.7-1.5-1.5-1.5H2z"/>' +
      '<path d="M14 3H9.5C8.7 3 8 3.7 8 4.5V13c0-.8.7-1.5 1.5-1.5H14z"/>',
    llista: '<path d="M6 4h8M6 8h8M6 12h8"/><path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01"/>',
  };

  function icona(nom, extra) {
    var camins = CAMINS[nom];
    if (!camins) return '';
    return '<svg class="icona ' + (extra || '') + '" viewBox="0 0 16 16" aria-hidden="true">' +
      camins + '</svg>';
  }

  TUT.dom = {
    esc: esc,
    paragrafs: paragrafs,
    normalitza: normalitza,
    $: $,
    $$: $$,
    delega: delega,
    minuts: minuts,
    suma_hora: suma_hora,
    data_llarga: data_llarga,
    identificador: identificador,
    icona: icona,
  };
})(window);
