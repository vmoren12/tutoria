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
  var per_tipus = {};
  (taxonomia.tipus || []).forEach(function (t) { per_tipus[t.id] = t; });
  var per_nivell = {};
  (taxonomia.nivells || []).forEach(function (n) { per_nivell[n.id] = n; });
  var per_tema = {};
  (taxonomia.temes || []).forEach(function (t) { per_tema[t.id] = t; });

  var llista = [];
  var index = {};

  /** Text sencer d'una fitxa, per a la cerca lliure. */
  function text_cercable(d) {
    return dom.normalitza([
      d.titol, d.resum, d.objectius, d.descripcio, d.materials,
      d.notes, d.consignes, d.preparacio, d.avaluacio,
      nom_categoria(d.categoria),
      nom_tipus(d.tipus),
      (d.nivells || []).map(nom_nivell).join(' '),
      (d.etiquetes || []).map(nom_etiqueta).join(' '),
      (d.temes || []).map(nom_tema).join(' '),
    ].join(' '));
  }

  function nom_categoria(id) {
    return per_categoria[id] ? per_categoria[id].nom : id || '';
  }

  function nom_etiqueta(id) {
    return per_etiqueta[id] ? per_etiqueta[id].nom : id || '';
  }

  function nom_tema(id) {
    return per_tema[id] ? per_tema[id].nom : id || '';
  }

  function nom_grup(id) {
    var g = per_grup[id];
    return g ? g.nom : id || '';
  }

  function nom_tipus(id) {
    return per_tipus[id] ? per_tipus[id].nom : id || '';
  }

  function nom_nivell(id) {
    return per_nivell[id] ? per_nivell[id].nom : id || '';
  }

  /** Nom de la família de categories («Dinàmiques de grup», «Programa HEBE»). */
  function families() {
    return taxonomia.families || [];
  }

  /** Famílies que són un programa de tutoria (l'HEBE): les seves categories
      fan de filtre propi. Les dels jocs de grup i de Sigues tu queden recollides
      a la temàtica. */
  function familia_programa(id) {
    var c = per_categoria[id];
    var f = c && (taxonomia.families || []).filter(function (x) {
      return x.id === (c.familia || 'grup');
    })[0];
    return f && f.programa ? f : null;
  }

  function blocs_temes() {
    return taxonomia.blocs_temes || [];
  }

  /** Temes d'un bloc, en l'ordre de la taxonomia. */
  function temes_de_bloc(bloc) {
    return (taxonomia.temes || []).filter(function (t) { return t.bloc === bloc; });
  }

  /** Com es presenta una fitxa a les targetes: el bloc del programa (HEBE) o,
      si no és d'un programa, el primer dels seus temes. */
  function classificacio(d) {
    if (familia_programa(d.categoria) || !(d.temes || []).length) {
      return { nom: nom_categoria(d.categoria), filtre: 'cat=' + d.categoria };
    }
    return { nom: nom_tema(d.temes[0]), filtre: 'tem=' + d.temes[0] };
  }

  /** Categories d'una família, en l'ordre de la taxonomia. */
  function categories_de(familia) {
    return taxonomia.categories.filter(function (c) {
      return (c.familia || 'grup') === familia;
    });
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
      d.nivells = d.nivells || [];
      d.temes = d.temes || [];
      d.tipus = d.tipus || 'dinamica';
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

  /** Recompte de fitxes per categoria, etiqueta, mida de grup, tipus, nivell i tema. */
  function recomptes(conjunt) {
    var categories = {};
    var etiquetes = {};
    var grups = {};
    var tipus = {};
    var nivells = {};
    var temes = {};
    (conjunt || llista).forEach(function (d) {
      categories[d.categoria] = (categories[d.categoria] || 0) + 1;
      grups[d.grup] = (grups[d.grup] || 0) + 1;
      tipus[d.tipus] = (tipus[d.tipus] || 0) + 1;
      d.etiquetes.forEach(function (t) { etiquetes[t] = (etiquetes[t] || 0) + 1; });
      d.nivells.forEach(function (n) { nivells[n] = (nivells[n] || 0) + 1; });
      d.temes.forEach(function (t) { temes[t] = (temes[t] || 0) + 1; });
    });
    return {
      categories: categories, etiquetes: etiquetes, grups: grups,
      tipus: tipus, nivells: nivells, temes: temes,
    };
  }

  /** Les activitats d'una unitat didàctica, en l'ordre que hi consta. */
  function filles(d) {
    return (d.activitats || []).map(obte).filter(Boolean);
  }

  /** Plantilla buida per al formulari de creació. */
  function plantilla() {
    return {
      id: '',
      titol: '',
      tipus: 'dinamica',
      categoria: taxonomia.categories.length ? taxonomia.categories[0].id : 'varies',
      etiquetes: [],
      nivells: [],
      temes: [],
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
    filles: filles,
    plantilla: plantilla,
    families: families,
    categories_de: categories_de,
    nom_categoria: nom_categoria,
    nom_etiqueta: nom_etiqueta,
    nom_tema: nom_tema,
    blocs_temes: blocs_temes,
    temes_de_bloc: temes_de_bloc,
    familia_programa: familia_programa,
    classificacio: classificacio,
    nom_grup: nom_grup,
    nom_tipus: nom_tipus,
    nom_nivell: nom_nivell,
    detall_grup: detall_grup,
    idioma: idioma,
    hi_ha_castella: hi_ha_castella,
    bibliografia: base.bibliografia || { introduccio: '', obres: [], eines: [] },
    hi_ha_catleg: base.dinamiques.length > 0,
  };
})(window);
