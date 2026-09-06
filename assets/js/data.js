/* data.js - catàleg en memòria: fusiona el catàleg base (data/bundle.js)
   amb les dinàmiques pròpies i les modificacions locals. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;

  var base = global.TUTORIA_DATA || { taxonomia: { categories: [], etiquetes: [], grups: [] }, dinamiques: [] };
  var taxonomia = base.taxonomia;

  var per_categoria = {};
  taxonomia.categories.forEach(function (c) { per_categoria[c.id] = c; });
  var per_etiqueta = {};
  taxonomia.etiquetes.forEach(function (t) { per_etiqueta[t.id] = t; });
  var per_grup = {};
  taxonomia.grups.forEach(function (g) { per_grup[g.id] = g; });

  var llista = [];
  var index = {};

  /** Text sencer d'una dinàmica, per a la cerca lliure. */
  function text_cercable(d) {
    return dom.normalitza([
      d.titol, d.resum, d.objectius, d.descripcio, d.materials,
      d.notes, d.consignes, d.preparacio, d.avaluacio,
      nom_categoria(d.categoria),
      (d.etiquetes || []).map(nom_etiqueta).join(' '),
    ].join(' '));
  }

  function nom_categoria(id) {
    return per_categoria[id] ? per_categoria[id].nom : id || '';
  }

  function nom_etiqueta(id) {
    return per_etiqueta[id] ? per_etiqueta[id].nom : id || '';
  }

  function nom_grup(id) {
    var g = per_grup[id];
    return g ? g.nom : id || '';
  }

  function detall_grup(id) {
    var g = per_grup[id];
    return g && g.detall ? g.detall : '';
  }

  /* Les fitxes del bundle porten el text català com a principal i l'original
     castellà dins de `es`. Amb la preferència en castellà, es promou `es`. */
  var hi_ha_castella = base.dinamiques.some(function (d) { return !!d.es; });

  function idioma() {
    var triat = TUT.store.estat.preferencies.idioma;
    return triat === 'es' && hi_ha_castella ? 'es' : 'ca';
  }

  /** La fitxa en la llengua triada, sense perdre l'altra versió. */
  function en_llengua(d) {
    if (idioma() !== 'es' || !d.es) return Object.assign({}, d);
    return Object.assign({}, d, d.es);
  }

  /** Reconstrueix el catàleg fusionant base + canvis locals. */
  function reconstrueix() {
    var propies = TUT.store.estat.dinamiques;
    var esborrades = TUT.store.estat.esborrades;
    var acumulat = {};

    base.dinamiques.forEach(function (d) {
      if (esborrades.indexOf(d.id) >= 0) return;
      acumulat[d.id] = Object.assign(en_llengua(d), { origen: 'cataleg' });
    });

    Object.keys(propies).forEach(function (id) {
      var d = propies[id];
      acumulat[id] = Object.assign({}, acumulat[id] || {}, d, {
        origen: acumulat[id] ? 'modificada' : 'propia',
      });
    });

    llista = Object.keys(acumulat).map(function (id) {
      var d = acumulat[id];
      d.etiquetes = d.etiquetes || [];
      d.durada = Number(d.durada) || 15;
      d._cerca = text_cercable(d);
      return d;
    });

    llista.sort(function (a, b) { return a.titol.localeCompare(b.titol, 'ca'); });

    index = {};
    llista.forEach(function (d) { index[d.id] = d; });
    return llista;
  }

  function tot() { return llista; }

  function obte(id) { return index[id] || null; }

  /** Recompte de dinàmiques per categoria i per etiqueta. */
  function recomptes(conjunt) {
    var categories = {};
    var etiquetes = {};
    var grups = {};
    (conjunt || llista).forEach(function (d) {
      categories[d.categoria] = (categories[d.categoria] || 0) + 1;
      grups[d.grup] = (grups[d.grup] || 0) + 1;
      d.etiquetes.forEach(function (t) { etiquetes[t] = (etiquetes[t] || 0) + 1; });
    });
    return { categories: categories, etiquetes: etiquetes, grups: grups };
  }

  /** Plantilla buida per al formulari de creació. */
  function plantilla() {
    return {
      id: '',
      titol: '',
      categoria: taxonomia.categories.length ? taxonomia.categories[0].id : 'varies',
      etiquetes: [],
      durada: 15,
      grup: 'mitja',
      materials: '',
      resum: '',
      objectius: '',
      participants: '',
      espai: '',
      preparacio: '',
      consignes: '',
      descripcio: '',
      avaluacio: '',
      notes: '',
      font: '',
    };
  }

  TUT.data = {
    taxonomia: taxonomia,
    reconstrueix: reconstrueix,
    tot: tot,
    obte: obte,
    recomptes: recomptes,
    plantilla: plantilla,
    nom_categoria: nom_categoria,
    nom_etiqueta: nom_etiqueta,
    nom_grup: nom_grup,
    detall_grup: detall_grup,
    idioma: idioma,
    hi_ha_castella: hi_ha_castella,
    bibliografia: base.bibliografia || { introduccio: '', obres: [], eines: [] },
    hi_ha_catleg: base.dinamiques.length > 0,
  };
})(window);
