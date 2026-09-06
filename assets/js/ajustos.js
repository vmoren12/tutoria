/* ajustos.js - preferències, còpies de seguretat i dinàmiques amagades. */
(function (global) {
  'use strict';

  var TUT = (global.TUT = global.TUT || {});
  var dom = TUT.dom;
  var esc = dom.esc;

  function descarrega(nom, contingut) {
    var blob = new Blob([contingut], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function marca_de_temps() {
    return new Date().toISOString().slice(0, 10);
  }

  function render(contenidor) {
    var prefs = TUT.store.estat.preferencies;
    var propies = Object.keys(TUT.store.estat.dinamiques);
    var amagades = TUT.store.estat.esborrades;

    contenidor.innerHTML = '' +
      '<div class="vista__capcalera">' +
        '<div>' +
          '<h1 class="vista__titol">Ajustos</h1>' +
          '<p class="vista__descripcio">Les dades es desen només en aquest navegador. ' +
            'Fes còpies de seguretat si canvies d\'ordinador.</p>' +
        '</div>' +
      '</div>' +

      '<div class="formulari">' +
        '<fieldset>' +
          '<legend>Aparença</legend>' +
          '<div class="formulari__fila" style="margin-top:10px">' +
            '<div><label for="a-tema">Tema</label><select id="a-tema">' +
              ['sistema', 'clar', 'fosc'].map(function (t) {
                return '<option value="' + t + '"' + (prefs.tema === t ? ' selected' : '') + '>' +
                  ({ sistema: 'Segueix el sistema', clar: 'Clar', fosc: 'Fosc' })[t] + '</option>';
              }).join('') + '</select></div>' +
            (TUT.data.hi_ha_castella
              ? '<div><label for="a-idioma">Llengua de les dinàmiques</label>' +
                '<select id="a-idioma">' +
                  [['ca', 'Català'], ['es', 'Castellà (original)']].map(function (o) {
                    return '<option value="' + o[0] + '"' +
                      (TUT.data.idioma() === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
                  }).join('') +
                '</select>' +
                '<p class="formulari__ajuda">El catàleg desa les dues versions. Les dinàmiques ' +
                  'que hagis creat o editat es mostren sempre tal com les vas escriure.</p></div>'
              : '') +
          '</div>' +
        '</fieldset>' +

        '<fieldset>' +
          '<legend>Dades del centre</legend>' +
          '<div class="formulari__fila" style="margin-top:10px">' +
            '<div><label for="a-centre">Nom del centre</label>' +
              '<input type="text" id="a-centre" value="' + esc(prefs.centre) +
              '" placeholder="Institut…">' +
              '<p class="formulari__ajuda">Apareix a la capçalera dels fulls de sessió.</p></div>' +
            '<div><label for="a-tutor">Nom del tutor o tutora</label>' +
              '<input type="text" id="a-tutor" value="' + esc(prefs.tutor) + '">' +
              '<p class="formulari__ajuda">S\'omple automàticament a les sessions noves.</p></div>' +
          '</div>' +
        '</fieldset>' +

        '<fieldset>' +
          '<legend>Còpies de seguretat</legend>' +
          '<p class="petit tenue" style="margin:10px 0">' +
            'Sessions desades: ' + TUT.store.estat.sessions.length +
            ' · Dinàmiques pròpies o editades: ' + propies.length +
            ' · Dinàmiques amagades: ' + amagades.length + '</p>' +
          '<div class="fila">' +
            '<button type="button" class="boto" id="exporta-tot">Exporta-ho tot</button>' +
            '<button type="button" class="boto" id="exporta-dinamiques"' +
              (propies.length ? '' : ' disabled') + '>Exporta les dinàmiques pròpies</button>' +
            '<label class="boto" for="importa" style="margin:0">Importa una còpia</label>' +
            '<input type="file" id="importa" accept="application/json,.json" ' +
              'class="nomes-lector" aria-label="Importa una còpia de seguretat">' +
          '</div>' +
          '<p class="formulari__ajuda">L\'exportació de dinàmiques pròpies fa servir el mateix ' +
            'format que els fitxers de <code>data/dinamiques/</code>, així les pots afegir al repositori.</p>' +
        '</fieldset>' +

        (amagades.length
          ? '<fieldset><legend>Dinàmiques amagades</legend><ul class="llista-sessions" style="margin-top:10px">' +
            amagades.map(function (id) {
              return '<li class="element-sessio"><div class="creix petit">' + esc(id) + '</div>' +
                '<button type="button" class="boto boto--petit" data-recupera="' + esc(id) +
                '">Recupera</button></li>';
            }).join('') + '</ul></fieldset>'
          : '') +

        '<fieldset>' +
          '<legend>Zona de risc</legend>' +
          '<p class="petit tenue" style="margin:10px 0">Esborra totes les sessions, ' +
            'les dinàmiques pròpies i les modificacions locals.</p>' +
          '<button type="button" class="boto boto--perill" id="buida">Esborra les dades locals</button>' +
        '</fieldset>' +

        '<fieldset>' +
          '<legend>Sobre l\'aplicació</legend>' +
          '<p class="petit tenue" style="margin-top:10px">Catàleg base: ' +
            TUT.data.tot().length + ' dinàmiques. Les fitxes provenen de reculls de dinàmiques ' +
            'de grup publicats en castellà; el text català és una traducció automàtica revisable ' +
            'i qualsevol fitxa es pot editar per adaptar-la al grup. Consulta les obres d\'origen ' +
            'a la <a href="#/bibliografia">bibliografia</a>.</p>' +
        '</fieldset>' +
      '</div>';

    dom.$('#a-tema', contenidor).addEventListener('change', function (event) {
      TUT.store.actualitza_preferencies({ tema: event.target.value });
      TUT.app.aplica_tema();
    });

    var tria_idioma = dom.$('#a-idioma', contenidor);
    if (tria_idioma) {
      tria_idioma.addEventListener('change', function (event) {
        TUT.store.actualitza_preferencies({ idioma: event.target.value });
        TUT.data.reconstrueix();
        TUT.app.encamina();
        TUT.ui.avis(event.target.value === 'es'
          ? 'Catàleg en castellà.' : 'Catàleg en català.');
      });
    }

    ['centre', 'tutor'].forEach(function (camp) {
      dom.$('#a-' + camp, contenidor).addEventListener('input', function (event) {
        var canvi = {};
        canvi[camp] = event.target.value;
        TUT.store.actualitza_preferencies(canvi);
      });
    });

    dom.$('#exporta-tot', contenidor).addEventListener('click', function () {
      descarrega('tutoria-copia-' + marca_de_temps() + '.json',
        JSON.stringify(TUT.store.exporta(), null, 2));
      TUT.ui.avis('Còpia de seguretat descarregada.');
    });

    dom.$('#exporta-dinamiques', contenidor).addEventListener('click', function () {
      var llista = Object.keys(TUT.store.estat.dinamiques).map(function (id) {
        var d = Object.assign({}, TUT.store.estat.dinamiques[id]);
        delete d.origen;
        delete d._cerca;
        return d;
      });
      descarrega('dinamiques-propies-' + marca_de_temps() + '.json',
        JSON.stringify(llista, null, 2));
      TUT.ui.avis(llista.length + ' dinàmiques exportades.');
    });

    dom.$('#importa', contenidor).addEventListener('change', function (event) {
      var fitxer = event.target.files && event.target.files[0];
      if (!fitxer) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var contingut = JSON.parse(String(lector.result));
          if (Array.isArray(contingut)) {
            contingut.forEach(function (d) {
              if (d && d.id && d.titol) TUT.store.desa_dinamica(d);
            });
            TUT.ui.avis(contingut.length + ' dinàmiques importades.');
          } else {
            TUT.store.importa(contingut, true);
            TUT.ui.avis('Còpia importada.');
          }
          TUT.data.reconstrueix();
          TUT.app.encamina();
        } catch (error) {
          TUT.ui.avis('No s\'ha pogut llegir el fitxer.');
        }
      };
      lector.readAsText(fitxer);
      event.target.value = '';
    });

    dom.delega(contenidor, 'click', '[data-recupera]', function (event, boto) {
      TUT.store.restaura_dinamica(boto.dataset.recupera);
      TUT.data.reconstrueix();
      TUT.app.encamina();
    });

    dom.$('#buida', contenidor).addEventListener('click', function () {
      TUT.ui.confirma('Esborra les dades locals',
        'S\'esborraran totes les sessions i les dinàmiques pròpies d\'aquest navegador. ' +
        'El catàleg base es manté.', 'Esborra-ho tot').then(function (ok) {
        if (!ok) return;
        TUT.store.buida();
        TUT.data.reconstrueix();
        TUT.app.encamina();
        TUT.ui.avis('Dades locals esborrades.');
      });
    });
  }

  TUT.ajustos = { render: render };
})(window);
