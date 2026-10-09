/* search.js - filtratge i ordenació del catàleg. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;

  var FILTRES_INICIALS = {
    consulta: '',
    tipus: [],
    nivells: [],
    temes: [],
    categories: [],
    siguestu: [],
    etiquetes: [],
    grups: [],
    durada_max: 0,     // 0 = sense límit
    material: 'tot',   // tot | sense | amb
    origen: 'tot',     // tot | cataleg | propies
  };

  function inicials() {
    return JSON.parse(JSON.stringify(FILTRES_INICIALS));
  }

  function actius(filtres) {
    return !!(filtres.consulta || filtres.tipus.length || filtres.nivells.length ||
      filtres.temes.length || filtres.categories.length || filtres.siguestu.length ||
      filtres.etiquetes.length ||
      filtres.grups.length || filtres.durada_max || filtres.material !== 'tot' ||
      filtres.origen !== 'tot');
  }

  function conte_totes(llista, requerides) {
    return requerides.every(function (r) { return llista.indexOf(r) >= 0; });
  }

  /** Aplica els filtres, excepte la faceta indicada (per als recomptes). */
  function filtra(dinamiques, filtres, excepte) {
    var termes = dom.normalitza(filtres.consulta).split(/\s+/).filter(Boolean);

    return dinamiques.filter(function (d) {
      if (excepte !== 'consulta' && termes.length) {
        for (var i = 0; i < termes.length; i++) {
          if (d._cerca.indexOf(termes[i]) < 0) return false;
        }
      }
      if (excepte !== 'tipus' && filtres.tipus.length &&
          filtres.tipus.indexOf(d.tipus) < 0) return false;

      /* Les fitxes sense nivell (la major part de les dinàmiques de grup) valen
         per a qualsevol curs, així que el filtre de nivell no les descarta. */
      if (excepte !== 'nivells' && filtres.nivells.length && d.nivells.length &&
          !d.nivells.some(function (n) { return filtres.nivells.indexOf(n) >= 0; })) {
        return false;
      }

      /* A diferència del nivell, una fitxa sense temes no surt quan es filtra
         per tema: els temes només els tenen les propostes que en tracten. */
      if (excepte !== 'temes' && filtres.temes.length &&
          !d.temes.some(function (t) { return filtres.temes.indexOf(t) >= 0; })) {
        return false;
      }

      if (excepte !== 'categories' && filtres.categories.length &&
          filtres.categories.indexOf(d.categoria) < 0) return false;

      /* Les etiquetes del web de Sigues tu es combinen com els temes: n'hi ha
         prou que la fitxa en tingui una de les marcades. */
      if (excepte !== 'siguestu' && filtres.siguestu.length &&
          !d.siguestu.some(function (t) { return filtres.siguestu.indexOf(t) >= 0; })) {
        return false;
      }

      if (excepte !== 'etiquetes' && filtres.etiquetes.length &&
          !conte_totes(d.etiquetes, filtres.etiquetes)) return false;

      if (excepte !== 'grups' && filtres.grups.length &&
          filtres.grups.indexOf(d.grup) < 0) return false;

      if (excepte !== 'durada' && filtres.durada_max && d.durada > filtres.durada_max) return false;

      if (excepte !== 'material' && filtres.material !== 'tot') {
        var te_material = !!(d.materials && d.materials.trim());
        if (filtres.material === 'sense' && te_material) return false;
        if (filtres.material === 'amb' && !te_material) return false;
      }

      if (excepte !== 'origen' && filtres.origen !== 'tot') {
        if (filtres.origen === 'propies' && d.origen === 'cataleg') return false;
        if (filtres.origen === 'cataleg' && d.origen !== 'cataleg') return false;
      }
      return true;
    });
  }

  /* Ordre de presentació dels tipus: primer les propostes més estructurades. */
  var PES_TIPUS = { unitat: 0, activitat: 1, dinamica: 2 };

  var ORDRES = {
    titol: function (a, b) { return a.titol.localeCompare(b.titol, 'ca'); },
    tipus: function (a, b) {
      return (PES_TIPUS[a.tipus] || 9) - (PES_TIPUS[b.tipus] || 9) || ORDRES.titol(a, b);
    },
    'durada-asc': function (a, b) { return a.durada - b.durada || ORDRES.titol(a, b); },
    'durada-desc': function (a, b) { return b.durada - a.durada || ORDRES.titol(a, b); },
    categoria: function (a, b) {
      return TUT.data.nom_categoria(a.categoria).localeCompare(
        TUT.data.nom_categoria(b.categoria), 'ca') || ORDRES.titol(a, b);
    },
  };

  function ordena(dinamiques, ordre) {
    var fn = ORDRES[ordre] || ORDRES.titol;
    return dinamiques.slice().sort(fn);
  }

  /** Codifica els filtres a la fragment-URL i els torna a llegir. */
  function a_parametres(filtres, ordre) {
    var p = new URLSearchParams();
    if (filtres.consulta) p.set('q', filtres.consulta);
    if (filtres.tipus.length) p.set('tip', filtres.tipus.join(','));
    if (filtres.nivells.length) p.set('niv', filtres.nivells.join(','));
    if (filtres.temes.length) p.set('tem', filtres.temes.join(','));
    if (filtres.categories.length) p.set('cat', filtres.categories.join(','));
    if (filtres.siguestu.length) p.set('st', filtres.siguestu.join(','));
    if (filtres.etiquetes.length) p.set('eti', filtres.etiquetes.join(','));
    if (filtres.grups.length) p.set('grup', filtres.grups.join(','));
    if (filtres.durada_max) p.set('max', String(filtres.durada_max));
    if (filtres.material !== 'tot') p.set('mat', filtres.material);
    if (filtres.origen !== 'tot') p.set('org', filtres.origen);
    if (ordre && ordre !== 'titol') p.set('ord', ordre);
    return p.toString();
  }

  function de_parametres(cadena) {
    var p = new URLSearchParams(cadena || '');
    var f = inicials();
    f.consulta = p.get('q') || '';
    f.tipus = (p.get('tip') || '').split(',').filter(Boolean);
    f.nivells = (p.get('niv') || '').split(',').filter(Boolean);
    f.temes = (p.get('tem') || '').split(',').filter(Boolean);
    f.categories = (p.get('cat') || '').split(',').filter(Boolean);
    f.siguestu = (p.get('st') || '').split(',').filter(Boolean);
    f.etiquetes = (p.get('eti') || '').split(',').filter(Boolean);
    f.grups = (p.get('grup') || '').split(',').filter(Boolean);
    f.durada_max = Number(p.get('max')) || 0;
    f.material = p.get('mat') || 'tot';
    f.origen = p.get('org') || 'tot';
    return { filtres: f, ordre: p.get('ord') || '' };
  }

  TUT.search = {
    inicials: inicials,
    actius: actius,
    filtra: filtra,
    ordena: ordena,
    a_parametres: a_parametres,
    de_parametres: de_parametres,
  };
})(window);
