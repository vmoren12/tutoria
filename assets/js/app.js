/* app.js - arrencada, encaminador per fragment d'URL i estat global de la interfície. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;

  var contenidor = null;
  var ruta_actual = '';

  /* --- tema ---------------------------------------------------------- */

  function aplica_tema() {
    var tema = TUT.store.estat.preferencies.tema || 'sistema';
    if (tema === 'sistema') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', tema);
  }

  /* --- capçalera ------------------------------------------------------ */

  function actualitza_comptador() {
    var s = TUT.store.sessio_activa();
    var marca = dom.$('#comptador-sessio');
    if (!marca) return;
    var n = s ? s.blocs.length : 0;
    marca.textContent = n;
    marca.hidden = n === 0;
  }

  function marca_navegacio(ruta) {
    var trossos = ruta.split('/').filter(Boolean);
    var seccio = trossos[0] || 'cataleg';
    if (seccio === 'dinamica') seccio = 'cataleg';
    if (seccio === 'sessio') {
      var activa = TUT.store.sessio_activa();
      seccio = activa && activa.id === trossos[1] ? 'sessio-activa' : 'sessions';
    }
    dom.$$('.navegacio__enllac').forEach(function (a) {
      var propia = a.dataset.seccio === seccio;
      if (propia) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* --- encaminament ---------------------------------------------------- */

  /** Actualitza els paràmetres de la ruta actual sense provocar navegació. */
  function actualitza_hash(parametres) {
    var base = ruta_actual;
    var nou = '#' + base + (parametres ? '?' + parametres : '');
    if (global.location.hash !== nou) {
      global.history.replaceState(null, '', nou);
    }
  }

  /**
   * Buida el contenidor i hi crea un node nou per a la vista.
   *
   * Cada vista registra els seus gestors amb delegació sobre el node que rep. Si
   * totes compartissin el mateix element, els gestors s'hi anirien acumulant i una
   * vista respondria als clics d'una altra (per exemple, `[data-treu]` existeix
   * tant al catàleg com al constructor de sessions). Amb un node per vista, els
   * gestors desapareixen en navegar.
   */
  function vista_nova() {
    contenidor.textContent = '';
    var vista = document.createElement('div');
    contenidor.appendChild(vista);
    return vista;
  }

  function encamina() {
    var brut = global.location.hash.replace(/^#/, '') || '/cataleg';
    var tall = brut.indexOf('?');
    var cami = tall >= 0 ? brut.slice(0, tall) : brut;
    var parametres = tall >= 0 ? brut.slice(tall + 1) : '';
    var trossos = cami.split('/').filter(Boolean);

    ruta_actual = cami;
    marca_navegacio(cami);
    global.scrollTo(0, 0);

    var vista = vista_nova();

    try {
      if (!trossos.length || trossos[0] === 'cataleg') {
        TUT.catalog.render(vista, parametres);
      } else if (trossos[0] === 'dinamica') {
        if (trossos[1] === 'nova') TUT.dinamica.editor(vista, 'nova');
        else if (trossos[2] === 'edita') TUT.dinamica.editor(vista, trossos[1]);
        else TUT.dinamica.render(vista, trossos[1]);
      } else if (trossos[0] === 'sessions') {
        TUT.sessions.llista(vista);
      } else if (trossos[0] === 'sessio') {
        if (trossos[2] === 'impressio') TUT.imprimir.render(vista, trossos[1]);
        else TUT.sessions.detall(vista, trossos[1]);
      } else if (trossos[0] === 'bibliografia') {
        TUT.bibliografia.render(vista);
      } else if (trossos[0] === 'ajustos') {
        TUT.ajustos.render(vista);
      } else {
        vista.innerHTML = '<div class="buit"><p>Aquesta pàgina no existeix.</p>' +
          '<a class="boto" href="#/cataleg">Vés al catàleg</a></div>';
      }
    } catch (error) {
      console.error(error);
      vista.innerHTML = '<div class="buit"><p>Hi ha hagut un error en carregar la vista.</p>' +
        '<a class="boto" href="#/cataleg">Torna al catàleg</a></div>';
    }

    actualitza_comptador();
  }

  /* --- arrencada -------------------------------------------------------- */

  function arrenca() {
    contenidor = dom.$('#contingut');

    if (!TUT.data.hi_ha_catleg) {
      contenidor.innerHTML = '<div class="buit">' +
        '<h1 style="margin-bottom:12px">No s\'ha pogut carregar el catàleg</h1>' +
        '<p>Falta el fitxer <code>data/bundle.js</code>. Genera\'l amb ' +
        '<code>npm run build</code> (o <code>node scripts/build-data.mjs</code>).</p></div>';
      return;
    }

    aplica_tema();
    TUT.data.reconstrueix();

    if (!TUT.store.disponible()) {
      TUT.ui.avis('El navegador no permet desar dades locals: els canvis no es conservaran.');
    }

    global.addEventListener('hashchange', encamina);
    encamina();

    var enllac_sessio = dom.$('#enllac-sessio');
    if (enllac_sessio) {
      enllac_sessio.addEventListener('click', function (event) {
        var s = TUT.store.sessio_activa();
        if (s) {
          event.preventDefault();
          global.location.hash = '#/sessio/' + s.id;
        }
      });
    }
  }

  TUT.app = {
    arrenca: arrenca,
    encamina: encamina,
    aplica_tema: aplica_tema,
    actualitza_comptador: actualitza_comptador,
    actualitza_hash: actualitza_hash,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrenca);
  } else {
    arrenca();
  }
})(window);
