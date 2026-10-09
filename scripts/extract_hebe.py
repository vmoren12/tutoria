# -*- coding: utf-8 -*-
"""
Extractor del "Programa HEBE" cap a JSON estructurat.

Us:
    python scripts/extract_hebe.py --pdf "Programa_HEBE....pdf" --out data/dinamiques

Requereix `pdftotext` (Xpdf o Poppler) al PATH.

A diferencia de "700 Dinamicas grupales", que es un recull de jocs solts, el
Programa HEBE es un programa d'accio tutorial per a 3r i 4t d'ESO organitzat en
cinc blocs, trenta-quatre unitats didactiques i les activitats d'aula de cada
unitat. Per aixo se n'extreuen dos tipus de fitxa:

    tipus "unitat"     la unitat didactica sencera (diverses sessions)
    tipus "activitat"  cada activitat d'aula de la unitat

Cada activitat guarda l'identificador de la seva unitat al camp `unitat`, i cada
unitat la llista de les seves activitats al camp `activitats`, de manera que
l'aplicacio les pot enllacar.

El text es llegeix amb `pdftotext` SENSE `-layout`: el llibre te taules i
requadres a dues columnes que en mode "layout" queden entrellacats, mentre que
en ordre de lectura cada paragraf surt sencer en una sola linia.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_pdf import autotag, strip_accents   # noqa: E402

FONT = ("Programa HEBE. Una propuesta de accion tutorial para 3.º y 4.º de "
        "Educacion Secundaria Obligatoria (Santana Vega, Ruiz Alfonso y "
        "Trenta; Ediciones Piramide, 2023)")

MINUTS_PER_SESSIO = 55

# Blocs del programa -> categoria interna de l'aplicacio
BLOCS = {
    1: "pensar-aprendre",
    2: "ser-persona",
    3: "conviure",
    4: "comportar-se",
    5: "prendre-decisions",
}

# Temes de cada unitat (vegeu `temes` a data/taxonomia.json). Les activitats
# hereten els de la seva unitat. Es fixen a ma perque el PDF no els diu.
TEMES = {
    "hebe-3-01": ["aprenentatge", "comunicacio"],
    "hebe-3-02": ["aprenentatge"],
    "hebe-3-03": ["aprenentatge"],
    "hebe-3-04": ["afectivitat", "emocions"],
    "hebe-3-05": ["diversitat", "compromis"],
    "hebe-3-06": ["assetjament", "pantalles"],
    "hebe-3-07": ["convivencia"],
    "hebe-3-08": ["genere"],
    "hebe-3-09": ["assetjament"],
    "hebe-3-10": ["convivencia", "comunicacio"],
    "hebe-3-11": ["comunicacio"],
    "hebe-3-12": ["medi-ambient", "orientacio"],
    "hebe-3-13": ["orientacio"],
    "hebe-3-14": ["orientacio"],
    "hebe-3-15": ["orientacio"],
    "hebe-3-16": ["orientacio"],
    "hebe-4-01": ["aprenentatge"],
    "hebe-4-02": ["aprenentatge", "orientacio"],
    "hebe-4-03": ["comunicacio", "orientacio"],
    "hebe-4-04": ["afectivitat", "emocions", "genere"],
    "hebe-4-05": ["orientacio"],
    "hebe-4-06": ["diversitat", "compromis"],
    "hebe-4-07": ["assetjament"],
    "hebe-4-08": ["convivencia"],
    "hebe-4-09": ["afectivitat", "violencies"],
    "hebe-4-10": ["medi-ambient", "orientacio"],
    "hebe-4-11": ["comunicacio"],
    "hebe-4-12": ["orientacio"],
    "hebe-4-13": ["orientacio"],
    "hebe-4-14": ["orientacio"],
    "hebe-4-15": ["orientacio"],
    "hebe-4-16": ["orientacio"],
    "hebe-4-17": ["orientacio"],
    "hebe-4-18": ["orientacio"],
}

SECCIONS = OrderedDict([
    ("JUSTIFICACION", "justificacio"),
    ("OBJETIVOS", "objectius"),
    ("COMPETENCIAS", "competencies"),
    ("CONTENIDOS", "continguts"),
    ("TEMPORALIZACION", "temporalitzacio"),
    ("ACTIVIDADES", "activitats"),
])

FI = ("Referencias bibliograficas", "ANEXO")

UNITAT_RE = re.compile(r"^(\d{1,2})\.\s+(\S.*)$")
ACTIVITAT_RE = re.compile(r"^ACTIVIDAD\s+(\d{1,2})\s*[.:]\s*(\S.*)$")
CURS_RE = re.compile(r"^Unidades para (\d)\.º de Educaci", re.IGNORECASE)
BLOC_RE = re.compile(r"^BLOQUE\s+(\d)$")
NOTA_RE = re.compile(r"^(?:\*|\d{1,2})\s+(?=[A-ZÁÉÍÓÚÑ«¿])")
CONTINUACIO_RE = re.compile(r"^(CUADRO|FICHA|TABLA)\s+\d+\.\s*\(continuaci", re.IGNORECASE)


def text_del_pdf(pdf):
    cmd = ["pdftotext", "-enc", "UTF-8", pdf, "-"]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.decode("utf-8", "replace"))
    return res.stdout.decode("utf-8", "replace")


# --------------------------------------------------------------------------
# Neteja
# --------------------------------------------------------------------------
def es_majuscules(text):
    lletres = [c for c in strip_accents(text) if c.isalpha()]
    return bool(lletres) and all(c.isupper() for c in lletres)


def neteja_linies(brut):
    """Treu capcaleres de pagina, numeros de pagina i marques de continuacio.

    Retorna una llista de parells (linia, comenca_pagina).
    """
    sortida = []
    for cru in brut.split("\n"):
        pagina = "\f" in cru
        linia = cru.replace("\f", "").strip()
        linia = re.sub(r"[\u00a0\u2002\u2003\u2009\u202f\t ]+", " ", linia)
        if not linia:
            continue
        if re.fullmatch(r"\d{1,3}", linia):                 # numero de pagina
            continue
        if linia == "PROGRAMA HEBE":
            continue
        if CONTINUACIO_RE.match(linia):
            continue
        # capcalera de pagina: el titol de la unitat repetit en majuscules
        if pagina and es_majuscules(linia) and len(linia) <= 80 \
                and strip_accents(linia) not in SECCIONS \
                and not BLOC_RE.match(linia):
            continue
        sortida.append((linia, pagina))
    return sortida


# El numero d'un requadre ("CUADRO 1. Casos propuestos") no obre cap llista.
SEPARADOR_LLISTA = re.compile(
    r"(?<!CUADRO)(?<!FICHA)(?<!TABLA)(?<!ANEXO)\s(?=\d{1,2}\.\s)")
SEPARADOR_PICS = re.compile(r"\s(?=• )")


def separa_pics(text):
    """Una llista de pics per linia, encara que el PDF les hagi ajuntat."""
    trossos = [t.strip() for t in SEPARADOR_PICS.split(text)]
    return [t for t in trossos if t]


def separa_llista(text):
    """Torna a partir les llistes numerades que `pdftotext` ha ajuntat.

    Nomes es parteix quan els numeros formen una serie creixent, per no tallar
    un "3. " que en realitat forma part d'una frase.
    """
    trossos = SEPARADOR_LLISTA.split(text)
    if len(trossos) < 2:
        return [text]
    numeros = []
    for t in trossos[1:]:
        m = re.match(r"(\d{1,2})\.", t)
        numeros.append(int(m.group(1)) if m else 0)
    if not all(b == a + 1 for a, b in zip(numeros, numeros[1:])):
        return [text]
    return [t.strip() for t in trossos if t.strip()]


FI_FRASE = ".!?:»…\"'”)"


def cos(linies):
    """Ajunta les linies en paragrafs i en treu les notes al peu."""
    paragrafs, notes = [], []
    for linia, _ in linies:
        if NOTA_RE.match(linia) and len(linia) > 60 and linia.endswith("."):
            notes.append(re.sub(r"^(?:\*|\d{1,2})\s+", "", linia))
            continue
        # una paraula tallada pel salt de columna: "argu-" + "mentacion"
        if paragrafs and paragrafs[-1].endswith("-"):
            paragrafs[-1] = paragrafs[-1][:-1] + linia
            continue
        # frase que continua a la linia seguent
        if paragrafs and paragrafs[-1] and paragrafs[-1][-1] not in FI_FRASE \
                and linia[:1].islower():
            paragrafs[-1] += " " + linia
            continue
        paragrafs.append(linia)

    esteses = []
    for p in paragrafs:
        for tros in separa_pics(p):
            esteses.extend(separa_llista(tros))
    return "\n\n".join(esteses).strip(), "\n\n".join(notes).strip()


def extracte(text, longitud=240):
    net = re.sub(r"\s+", " ", text).strip()
    if len(net) <= longitud:
        return net
    tall = net[:longitud]
    punt = tall.rfind(". ")
    return (tall[:punt + 1] if punt > longitud // 2 else
            tall.rsplit(" ", 1)[0] + "…")


# --------------------------------------------------------------------------
# Divisio del llibre
# --------------------------------------------------------------------------
def talla_unitats(linies):
    """Llista de unitats: (curs, bloc, numero, titol, linies del cos)."""
    unitats = []
    curs = None
    bloc = None
    actual = None

    for i, (linia, pagina) in enumerate(linies):
        if actual is not None and strip_accents(linia).startswith(FI):
            break

        m = CURS_RE.match(linia)
        if m:
            curs = int(m.group(1))
            continue
        m = BLOC_RE.match(linia)
        if m:
            bloc = int(m.group(1))
            continue

        m = UNITAT_RE.match(linia) if pagina else None
        # una unitat sempre obre amb JUSTIFICACION
        if m and any(strip_accents(l) == "JUSTIFICACION"
                     for l, _ in linies[i + 1:i + 3]):
            actual = dict(curs=curs, bloc=bloc, numero=int(m.group(1)),
                          titol=m.group(2).strip(), linies=[])
            unitats.append(actual)
            continue

        if actual is not None:
            actual["linies"].append((linia, pagina))

    return unitats


def talla_seccions(linies):
    """Separa les seccions fixes de la unitat i les seves activitats."""
    seccions = {}
    activitats = []
    actual = None
    activitat = None

    for linia, pagina in linies:
        clau = SECCIONS.get(strip_accents(linia))
        m = ACTIVITAT_RE.match(linia)
        if m:
            activitat = dict(numero=int(m.group(1)), titol=m.group(2).strip(), linies=[])
            activitats.append(activitat)
            actual = None
            continue
        if clau and not activitat:
            actual = clau
            seccions.setdefault(actual, [])
            continue
        if activitat is not None:
            activitat["linies"].append((linia, pagina))
        elif actual:
            seccions[actual].append((linia, pagina))

    return seccions, activitats


# --------------------------------------------------------------------------
# Camps derivats
# --------------------------------------------------------------------------
NUMEROS = {"una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5}


def sessions(text):
    """Sessions de tutoria que ocupa la unitat, segons la TEMPORALIZACION."""
    net = strip_accents(text).lower()
    for paraula, valor in NUMEROS.items():
        net = re.sub(r"%s" % paraula, str(valor), net)
    tall = net.find("sesion")
    if tall < 0:
        return 3
    xifres = [int(n) for n in re.findall(r"\d{1,2}", net[max(0, tall - 20):tall])]
    return max(2, min(6, max(xifres))) if xifres else 3


MATERIAL_REGLES = [
    (r"cuadro|ficha|anexo|cuestionario|tabla ", "Fotocopias de los cuadros y fichas de la actividad."),
    (r"internet|pagina web|paginas web|\bweb\b|buscador|navegar|\bred\b", "Ordenadores o tabletas con conexion a internet."),
    (r"videojuego|\bvideo\b|pelicula|cortometraje|proyecta|documental|cancion|musica", "Proyector o pantalla con sonido."),
    (r"pizarra|cartulina|rotulador|folio|papel continuo|mural|recorte", "Pizarra, cartulinas y material de escritura."),
]


def materials(text):
    net = strip_accents(text).lower()
    trobats = [frase for regla, frase in MATERIAL_REGLES if re.search(regla, net)]
    return " ".join(trobats)


def durada_activitat(text, per_defecte):
    minuts = [int(m.group(1)) for m in re.finditer(r"(\d{1,3})\s*minutos", text)]
    if minuts:
        return max(5, min(60, max(minuts)))
    return per_defecte


# --------------------------------------------------------------------------
def build(pdf, outdir):
    linies = neteja_linies(text_del_pdf(pdf))
    unitats = talla_unitats(linies)
    if not unitats:
        raise SystemExit("No he trobat cap unitat: ha canviat el PDF?")

    fitxes = []
    for u in unitats:
        seccions, activitats = talla_seccions(u["linies"])
        justificacio, _ = cos(seccions.get("justificacio", []))
        objectius, _ = cos(seccions.get("objectius", []))
        competencies, _ = cos(seccions.get("competencies", []))
        continguts, _ = cos(seccions.get("continguts", []))
        temporalitzacio, _ = cos(seccions.get("temporalitzacio", []))

        curs = u["curs"]
        categoria = BLOCS[u["bloc"]]
        nivell = "%deso" % curs
        participants = "Alumnado de %d.º de ESO." % curs
        identificador = "hebe-%d-%02d" % (curs, u["numero"])
        n_sessions = sessions(temporalitzacio)

        # El titol de la capcalera de l'activitat ja ve sencer; nomes s'agafa el
        # de la llista "ACTIVIDADES" quan aquell n'es una versio escurcada.
        llista = {}
        for entrada in separa_llista(cos(seccions.get("activitats", []))[0]):
            m = re.match(r"(\d{1,2})\.\s*(\S.*)", entrada)
            if m:
                llista[int(m.group(1))] = m.group(2).strip().rstrip(".")

        filles = []
        for a in activitats:
            text, notes = cos(a["linies"])
            if len(text) < 80:
                continue
            titol = a["titol"].strip().rstrip(".")
            sencer = llista.get(a["numero"], "")
            if sencer.startswith(titol) and len(sencer) > len(titol):
                titol = sencer
            fill = "%s-a%d" % (identificador, a["numero"])
            filles.append((fill, titol, text, notes, a["numero"]))

        base = max(10, min(55, 5 * round(
            n_sessions * MINUTS_PER_SESSIO / max(1, len(filles)) / 5)))

        for fill, titol, text, notes, numero in filles:
            fitxes.append(OrderedDict([
                ("id", fill),
                ("titol", titol),
                ("tipus", "activitat"),
                ("categoria", categoria),
                ("nivells", [nivell]),
                ("unitat", identificador),
                ("etiquetes", autotag(" ".join([titol, text]))),
                ("temes", TEMES.get(identificador, [])),
                ("durada", durada_activitat(text, base)),
                ("grup", "mitja"),
                ("materials", materials(" ".join([titol, text]))),
                ("resum", extracte(text)),
                ("objectius", ""),
                ("participants", participants),
                ("espai", ""),
                ("preparacio", ""),
                ("consignes", ""),
                ("descripcio", text),
                ("avaluacio", ""),
                ("notes", notes),
                ("font", FONT),
            ]))

        index = "\n\n".join("%d. %s" % (n, t) for _, t, _, _, n in filles)
        descripcio = justificacio
        if index:
            descripcio += "\n\nActividades de la unidad:\n\n" + index

        fitxes.append(OrderedDict([
            ("id", identificador),
            ("titol", u["titol"].rstrip(".")),
            ("tipus", "unitat"),
            ("categoria", categoria),
            ("nivells", [nivell]),
            ("activitats", [f for f, _, _, _, _ in filles]),
            ("etiquetes", sorted(set(autotag(" ".join([u["titol"], justificacio, objectius]))) | {"reflexio"})),
            ("temes", TEMES.get(identificador, [])),
            ("durada", n_sessions * MINUTS_PER_SESSIO),
            ("grup", "mitja"),
            ("materials", ""),
            ("resum", extracte(justificacio)),
            ("objectius", objectius),
            ("participants", participants),
            ("espai", ""),
            ("preparacio", ""),
            ("consignes", ""),
            ("descripcio", descripcio),
            ("avaluacio", ""),
            ("notes", "\n\n".join(x for x in [
                "Temporalización: " + temporalitzacio if temporalitzacio else "",
                "Competencias: " + competencies if competencies else "",
                "Contenidos: " + continguts if continguts else "",
            ] if x)),
            ("font", FONT),
        ]))

    os.makedirs(outdir, exist_ok=True)
    per_categoria = OrderedDict()
    for f in fitxes:
        per_categoria.setdefault(f["categoria"], []).append(f)

    for categoria, items in sorted(per_categoria.items()):
        items.sort(key=lambda x: (x["id"].rsplit("-a", 1)[0], "-a" in x["id"], x["id"]))
        ruta = os.path.join(outdir, "%s.json" % categoria)
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(items, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    unitats_n = sum(1 for f in fitxes if f["tipus"] == "unitat")
    print("Fitxes del Programa HEBE: %d (%d unitats, %d activitats)"
          % (len(fitxes), unitats_n, len(fitxes) - unitats_n))
    for categoria, items in sorted(per_categoria.items()):
        print("  %-18s %4d" % (categoria, len(items)))
    return fitxes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--out", default="data/dinamiques")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        sys.exit("No trobo el PDF: %s" % args.pdf)
    build(args.pdf, args.out)


if __name__ == "__main__":
    main()
