/* store.js - persistència local (localStorage) de dinàmiques pròpies,
   sessions i preferències. Tot queda al navegador de la persona usuària. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var CLAU = 'tutoria.v1';

  var PREFERENCIES_INICIALS = {
    tema: 'sistema',
    idioma: 'ca',     // llengua de les fitxes del catàleg: 'ca' o 'es'
    centre: '',
    tutor: '',
    vista: 'graella',
    ordre: 'titol',
    impressio: {
      objectius: true,
      materials: true,
      desenvolupament: true,
      preparacio: false,
      avaluacio: false,
      notes: false,
      signatura: false,
    },
  };

  var estat = {
    dinamiques: {},   // id -> dinàmica pròpia o sobreescriptura
    esborrades: [],   // ids del catàleg base amagats
    sessions: [],
    sessio_activa: null,
    preferencies: JSON.parse(JSON.stringify(PREFERENCIES_INICIALS)),
  };

  var oients = [];
  var disponible = true;

  function llegeix() {
    try {
      var cru = global.localStorage.getItem(CLAU);
      if (!cru) return;
      var desat = JSON.parse(cru);
      estat.dinamiques = desat.dinamiques || {};
      estat.esborrades = desat.esborrades || [];
      estat.sessions = desat.sessions || [];
      estat.sessio_activa = desat.sessio_activa || null;
      estat.preferencies = Object.assign(
        {},
        PREFERENCIES_INICIALS,
        desat.preferencies || {},
        { impressio: Object.assign({}, PREFERENCIES_INICIALS.impressio,
            (desat.preferencies || {}).impressio || {}) },
      );
    } catch (error) {
      disponible = false;
      console.warn('No s\'ha pogut llegir l\'emmagatzematge local:', error);
    }
  }

  function desa() {
    try {
      global.localStorage.setItem(CLAU, JSON.stringify(estat));
    } catch (error) {
      disponible = false;
      console.warn('No s\'ha pogut desar a l\'emmagatzematge local:', error);
    }
    oients.forEach(function (fn) { fn(estat); });
  }

  /* --- dinàmiques pròpies ------------------------------------------- */

  function desa_dinamica(dinamica) {
    estat.dinamiques[dinamica.id] = dinamica;
    var i = estat.esborrades.indexOf(dinamica.id);
    if (i >= 0) estat.esborrades.splice(i, 1);
    desa();
    return dinamica;
  }

  function esborra_dinamica(id, es_del_cataleg) {
    delete estat.dinamiques[id];
    if (es_del_cataleg && estat.esborrades.indexOf(id) < 0) estat.esborrades.push(id);
    desa();
  }

  function restaura_dinamica(id) {
    delete estat.dinamiques[id];
    var i = estat.esborrades.indexOf(id);
    if (i >= 0) estat.esborrades.splice(i, 1);
    desa();
  }

  /* --- sessions ------------------------------------------------------ */

  function sessio(id) {
    return estat.sessions.filter(function (s) { return s.id === id; })[0] || null;
  }

  function nova_sessio(dades) {
    var avui = new Date();
    var s = Object.assign({
      id: TUT.dom.identificador('s'),
      titol: 'Sessió de tutoria',
      nivell: '',
      grup: '',
      data: avui.toISOString().slice(0, 10),
      hora_inici: '09:00',
      durada_prevista: 55,
      tutor: estat.preferencies.tutor || '',
      objectius: '',
      observacions: '',
      blocs: [],
      creada: new Date().toISOString(),
    }, dades || {});
    estat.sessions.unshift(s);
    estat.sessio_activa = s.id;
    desa();
    return s;
  }

  function actualitza_sessio(id, canvis) {
    var s = sessio(id);
    if (!s) return null;
    Object.assign(s, canvis);
    desa();
    return s;
  }

  function esborra_sessio(id) {
    estat.sessions = estat.sessions.filter(function (s) { return s.id !== id; });
    if (estat.sessio_activa === id) {
      estat.sessio_activa = estat.sessions.length ? estat.sessions[0].id : null;
    }
    desa();
  }

  function duplica_sessio(id) {
    var original = sessio(id);
    if (!original) return null;
    var copia = JSON.parse(JSON.stringify(original));
    copia.id = TUT.dom.identificador('s');
    copia.titol = original.titol + ' (còpia)';
    copia.creada = new Date().toISOString();
    estat.sessions.unshift(copia);
    estat.sessio_activa = copia.id;
    desa();
    return copia;
  }

  function sessio_activa() {
    var s = estat.sessio_activa ? sessio(estat.sessio_activa) : null;
    return s || (estat.sessions.length ? estat.sessions[0] : null);
  }

  function activa_sessio(id) {
    estat.sessio_activa = id;
    desa();
  }

  /* --- blocs d'una sessió -------------------------------------------- */

  function afegeix_bloc(id_sessio, bloc) {
    var s = sessio(id_sessio);
    if (!s) return null;
    s.blocs.push(Object.assign({ id: TUT.dom.identificador('b'), notes: '' }, bloc));
    desa();
    return s;
  }

  /** Quantes vegades una dinàmica ja és en una sessió (per defecte, l'activa). */
  function vegades_a_sessio(id_dinamica, id_sessio) {
    var s = id_sessio ? sessio(id_sessio) : sessio_activa();
    if (!s) return 0;
    return s.blocs.filter(function (b) {
      return b.tipus === 'dinamica' && b.dinamica === id_dinamica;
    }).length;
  }

  function actualitza_bloc(id_sessio, id_bloc, canvis) {
    var s = sessio(id_sessio);
    if (!s) return null;
    s.blocs.forEach(function (b) { if (b.id === id_bloc) Object.assign(b, canvis); });
    desa();
    return s;
  }

  function treu_bloc(id_sessio, id_bloc) {
    var s = sessio(id_sessio);
    if (!s) return null;
    s.blocs = s.blocs.filter(function (b) { return b.id !== id_bloc; });
    desa();
    return s;
  }

  function mou_bloc(id_sessio, id_bloc, direccio) {
    var s = sessio(id_sessio);
    if (!s) return null;
    var i = s.blocs.findIndex(function (b) { return b.id === id_bloc; });
    var j = i + direccio;
    if (i < 0 || j < 0 || j >= s.blocs.length) return s;
    var mogut = s.blocs.splice(i, 1)[0];
    s.blocs.splice(j, 0, mogut);
    desa();
    return s;
  }

  /* --- preferències --------------------------------------------------- */

  function actualitza_preferencies(canvis) {
    estat.preferencies = Object.assign({}, estat.preferencies, canvis);
    desa();
    return estat.preferencies;
  }

  function actualitza_impressio(canvis) {
    estat.preferencies.impressio = Object.assign({}, estat.preferencies.impressio, canvis);
    desa();
  }

  /* --- còpia de seguretat --------------------------------------------- */

  function exporta() {
    return {
      format: 'tutoria-copia',
      versio: 1,
      generat: new Date().toISOString(),
      dades: JSON.parse(JSON.stringify(estat)),
    };
  }

  function importa(objecte, fusiona) {
    var dades = objecte && objecte.dades ? objecte.dades : objecte;
    if (!dades || typeof dades !== 'object') throw new Error('Fitxer no reconegut.');
    if (!fusiona) {
      estat.dinamiques = {};
      estat.esborrades = [];
      estat.sessions = [];
    }
    Object.assign(estat.dinamiques, dades.dinamiques || {});
    (dades.esborrades || []).forEach(function (id) {
      if (estat.esborrades.indexOf(id) < 0) estat.esborrades.push(id);
    });
    var existents = estat.sessions.map(function (s) { return s.id; });
    (dades.sessions || []).forEach(function (s) {
      if (existents.indexOf(s.id) < 0) estat.sessions.push(s);
    });
    if (dades.preferencies) actualitza_preferencies(dades.preferencies);
    desa();
  }

  function buida() {
    estat.dinamiques = {};
    estat.esborrades = [];
    estat.sessions = [];
    estat.sessio_activa = null;
    desa();
  }

  llegeix();

  TUT.store = {
    estat: estat,
    disponible: function () { return disponible; },
    en_canviar: function (fn) { oients.push(fn); },
    desa_dinamica: desa_dinamica,
    esborra_dinamica: esborra_dinamica,
    restaura_dinamica: restaura_dinamica,
    sessio: sessio,
    nova_sessio: nova_sessio,
    actualitza_sessio: actualitza_sessio,
    esborra_sessio: esborra_sessio,
    duplica_sessio: duplica_sessio,
    sessio_activa: sessio_activa,
    activa_sessio: activa_sessio,
    afegeix_bloc: afegeix_bloc,
    vegades_a_sessio: vegades_a_sessio,
    actualitza_bloc: actualitza_bloc,
    treu_bloc: treu_bloc,
    mou_bloc: mou_bloc,
    actualitza_preferencies: actualitza_preferencies,
    actualitza_impressio: actualitza_impressio,
    exporta: exporta,
    importa: importa,
    buida: buida,
  };
})(window);
