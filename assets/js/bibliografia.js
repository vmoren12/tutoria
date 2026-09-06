/* bibliografia.js - obres d'on provenen les dinàmiques del catàleg. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  /** Quantes dinàmiques del catàleg citen una obra determinada. */
  function recompte(font) {
    if (!font) return 0;
    return TUT.data.tot().filter(function (d) { return d.font === font; }).length;
  }

  function obra(o, amb_recompte) {
    var n = amb_recompte ? recompte(o.font) : 0;
    var titol = o.url
      ? '<a href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(o.titol) + '</a>'
      : esc(o.titol);

    var dades = [o.autoria, o.publicacio].filter(Boolean).map(esc).join(' · ');

    return '<li class="obra">' +
      '<div class="obra__titol">' + titol + '</div>' +
      (dades ? '<div class="petit tenue">' + dades + '</div>' : '') +
      (o.url ? '<div class="obra__enllac petit">' + esc(o.url) + '</div>' : '') +
      (o.nota ? '<p class="petit suau" style="margin-top:6px">' + esc(o.nota) + '</p>' : '') +
      (n ? '<div class="obra__recompte petit">' + n +
        (n === 1 ? ' dinàmica del catàleg' : ' dinàmiques del catàleg') + '</div>' : '') +
    '</li>';
  }

  function render(contenidor) {
    var b = TUT.data.bibliografia;
    var obres = b.obres || [];
    var eines = b.eines || [];

    contenidor.innerHTML = '' +
      '<div class="vista__capcalera">' +
        '<div>' +
          '<h1 class="vista__titol">Bibliografia</h1>' +
          (b.introduccio
            ? '<p class="vista__descripcio">' + esc(b.introduccio) + '</p>' : '') +
        '</div>' +
      '</div>' +

      (obres.length
        ? '<section class="fitxa__seccio" style="max-width:var(--amplada-lectura)">' +
            '<h2 class="fitxa__etiqueta-seccio">Obres d\'origen</h2>' +
            '<ul class="obres">' + obres.map(function (o) { return obra(o, true); }).join('') +
            '</ul>' +
          '</section>'
        : '<div class="buit"><p>Encara no hi ha cap obra a la bibliografia.</p></div>') +

      (eines.length
        ? '<section class="fitxa__seccio" style="max-width:var(--amplada-lectura)">' +
            '<h2 class="fitxa__etiqueta-seccio">Eines</h2>' +
            '<ul class="obres">' + eines.map(function (o) { return obra(o, false); }).join('') +
            '</ul>' +
          '</section>'
        : '') +

      '<p class="petit tenue" style="max-width:var(--amplada-lectura)">' +
        'Les fitxes són adaptacions d\'aquestes obres per a l\'ús a l\'aula. ' +
        'Per afegir una obra nova, editeu <code>data/bibliografia.json</code> i torneu a ' +
        'generar el catàleg amb <code>npm run build</code>.</p>';
  }

  TUT.bibliografia = { render: render };
})(window);
