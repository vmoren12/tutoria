/* search.js - filtratge i ordenació del catàleg. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;

  var FILTRES_INICIALS = {
    consulta: '',
    categories: [],
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
    return !!(filtres.consulta || filtres.categories.length || filtres.etiquetes.length ||
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
      if (excepte !== 'categories' && filtres.categories.length &&
          filtres.categories.indexOf(d.categoria) < 0) return false;

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

  var ORDRES = {
    titol: function (a, b) { return a.titol.localeCompare(b.titol, 'ca'); },
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
    if (filtres.categories.length) p.set('cat', filtres.categories.join(','));
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
    f.categories = (p.get('cat') || '').split(',').filter(Boolean);
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
