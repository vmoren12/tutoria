# -*- coding: utf-8 -*-
"""
Extractor del "Manual de Tecnicas y Dinamicas" (ECOSUR-UJAT, 2007) cap a JSON.

Us:
    python scripts/extract_manual.py --pdf "zManual-de-Tecnicas-y-Dinamicas.pdf" \
        --out data/dinamiques

Requereix `pdftotext` (Xpdf o Poppler) al PATH.

El manual te una maquetacio molt regular: el titol de cada tecnica va centrat a
la seva linia i el segueixen les etiquetes de camp, cada una tambe a linia
propia ("Objetivos:", "Procedimiento de aplicacion:", "Discusion:", "Utilidad:"
...). Una minoria de fitxes fa servir la variant en preguntes ("Que es?",
"Para que sirve?", "Como se hace?").

A diferencia de `extract_pdf.py` i `extract_hebe.py`, que escriuen els fitxers
de categoria sencers, aquest extractor els FUSIONA: nomes reemplaca les fitxes
que ja porten aquesta font i deixa intactes les de les altres obres, perque les
categories son compartides. Aixi es pot tornar a executar sempre que calgui.

Les tecniques que el manual repeteix i les que ja son al cataleg sortides d'una
altra obra no s'incorporen: la llista es a REPETIDES, amb el motiu de cada una.
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
from extract_pdf import (                                        # noqa: E402
    MINOR_WORDS, autotag, capitalitza, guess_duration, guess_group_size,
    guess_materials, slugify, strip_accents,
)

FONT = ("Manual de Tecnicas y Dinamicas (Maria de Jesus Gomez Hernandez; "
        "SIBE/ECOSUR - UJAT, 2007)")

# Seccions del manual -> categoria interna de l'aplicacio
SECCIONS = [
    (re.compile(r"^I\.-\s*T.cnicas De Presentaci.n"), "presentacio"),
    (re.compile(r"^II\.-\s*T.cnicas De Relajaci.n"), "distensio"),
    (re.compile(r"^III\.-\s*T.cnicas De Animaci.n"), "animacio"),
    (re.compile(r"^1\.-\s*T.cnicas de abstracci.n"), "analisi"),
    (re.compile(r"^2\.\s*T.cnicas De Comunicaci.n"), "comunicacio"),
    (re.compile(r"^3\.\s*T.cnicas De Dramatizaci.n"), "dramatitzacio"),
    (re.compile(r"^V\.-\s*T.cnicas de Cierre"), "tancament"),
]
# "IV.- Tecnicas Para Trabajar Contenido Tematico" nomes obre les tres
# subseccions que la componen; no du fitxes propies.

# Etiqueta del manual -> camp intern de la fitxa
CAMPS = [
    (r"objetivos?", "objectius"),
    (r"propositos?", "objectius"),
    (r"¿?para que sirve\??", "objectius"),
    (r"¿?que es\??", "resum"),
    (r"materiales?", "materials"),
    (r"recursos", "materials"),
    (r"procedimiento de (aplicacion|participacion)", "descripcio"),
    (r"¿?como se hace\??", "descripcio"),
    (r"pasos a seguir", "descripcio"),
    (r"desarrollo", "descripcio"),
    (r"discusion", "avaluacio"),
    (r"evaluacion", "avaluacio"),
    (r"utilidad", "notes"),
    (r"recomendaciones?", "notes"),
    (r"sugerencias?", "notes"),
    (r"variantes?", "notes"),
    (r"observaciones?", "notes"),
    (r"nota", "notes"),
]
CAMP_RE = [(re.compile(r"^(?:%s)\s*[:.]?\s*$" % p, re.IGNORECASE), c) for p, c in CAMPS]

SOROLL = re.compile(r"^\s*(\d{1,3}\s+)?ECOSUR-UJAT\s*$|"
                    r"^\s*Manual de Din.micas (de Grupo para el Aprendizaje|y T.cnicas)\s*$|"
                    r"^\s*\d{1,3}\s*$")

# Titol numerat que no ha quedat centrat ("4. Rompecabezas.")
TITOL_NUMERAT = re.compile(r"^\d{1,2}\.\s+([A-Z].{2,50})\.$")

# Final del cos del manual: a partir d'aqui nomes hi ha la bibliografia.
FINAL = re.compile(r"^Bibliograf.a\s*$")

INDENTACIO_TITOL = 13

# Un unic titol del manual ha quedat encavalcat amb l'etiqueta que el segueix.
CORRECCIONS = {
    "Objetivos:  El sociodrama.": [" " * INDENTACIO_TITOL + "El sociodrama",
                                   "Objetivos:"],
}

# Tecniques que NO s'incorporen al cataleg perque ja hi son, encara que sigui
# amb un altre titol: el manual i «700 dinamicas grupales» beuen de la mateixa
# tradicio d'educacio popular llatinoamericana i comparteixen molts jocs. La
# comparacio s'ha fet a ma, llegint les dues versions; el valor es la fitxa
# del cataleg que ja cobreix la tecnica.
REPETIDES = {
    "baile-de-presentacion": "baile-de-presentacion",
    "la-telarana": "telarana-3 i la-telarana-madeja-de-lana",
    "presentacion-subjetiva": "identificacion-con-un-animal",
    "el-amigo-secreto": "el-amigo-secreto",
    "mar-adentro-y-mar-afuera": "marea-sube-marea-baja",
    "el-alambre-pelado": "el-alambre-pelado",
    "el-cuento-vivo": "cuento-vivo",
    "el-pueblo-manda": "simon-dice",
    "el-correo": "el-sol-brilla-en i el-super-correo",
    "la-doble-rueda": "la-doble-rueda",
    "se-murio-chicho": "se-murio-chicho",
    "esto-me-recuerda": "esto-me-recuerda",
    "las-estatuas": "grupo-de-estatuas",
    # El manual mateix repeteix tres tecniques al capitol de tancament, amb el
    # sol canvi de no demanar que s'expliqui la resposta.
    "la-palabra-clave": "palabras-claves (dins del mateix manual)",
    "la-pantomima-2": "la-pantomima (dins del mateix manual)",
    "las-estatuas-2": "las-estatuas (dins del mateix manual)",
}

# Titols que al cataleg no dirien res per si sols. El manual descriu la
# relaxacio amb un unic exemple desenvolupat, titulat "Ejemplo basico".
TITOLS = {
    "Ejemplo Básico": "Relajación Guiada (ejemplo básico)",
}


def text_del_pdf(pdf):
    cmd = ["pdftotext", "-layout", "-enc", "UTF-8", pdf, "-"]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.decode("utf-8", "replace"))
    return res.stdout.decode("utf-8", "replace")


def camp_de(linia):
    net = strip_accents(linia).strip()
    for rx, camp in CAMP_RE:
        if rx.match(net):
            return camp
    return None


CAMPS_D_OBERTURA = {"objectius", "descripcio", "resum"}


def es_titol(linia, camp_actual, seguents):
    """Titol de tecnica.

    La majoria van centrats a la seva linia, i n'hi ha prou amb el sagnat. Un
    grapat, pero, han quedat arrenglerats a l'esquerra com el cos del text; es
    reconeixen perque arriben quan la tecnica anterior ja s'ha acabat (som al
    seu darrer camp, "Utilidad" o "Variante") i els segueix de seguida una
    etiqueta que obre fitxa nova.
    """
    net = linia.strip()
    if not net or camp_de(net):
        return None
    m = TITOL_NUMERAT.match(net)
    if m:
        return m.group(1)
    if not (3 <= len(net) <= 60) or net.endswith(":"):
        return None
    sagnat = len(linia) - len(linia.lstrip())
    if sagnat >= INDENTACIO_TITOL:
        return net
    if camp_actual == "notes" and net[0].isupper() and not net.endswith((".", ",", ";")) \
            and any(c in CAMPS_D_OBERTURA for c in seguents):
        return net
    return None


def talla(text):
    """Recorre el manual i en treu (categoria, titol, [linies]) per tecnica."""
    brut = [l.rstrip() for l in text.replace("\f", "\n").split("\n")]
    linies = []
    for l in brut:
        if not l.strip() or SOROLL.match(l):
            continue
        linies.extend(CORRECCIONS.get(l.strip(), [l]))

    fitxes = []
    categoria = None
    actual = None
    camp = None

    for i, linia in enumerate(linies):
        net = linia.strip()
        if categoria and FINAL.match(net):
            break

        seccio = next((c for rx, c in SECCIONS if rx.match(net)), None)
        if seccio:
            categoria = seccio
            actual = None
            camp = None
            continue
        if not categoria:
            continue                        # portada, index i introduccio

        seguents = [camp_de(x) for x in linies[i + 1:i + 4]]
        titol = es_titol(linia, camp, seguents)
        if titol:
            actual = OrderedDict([("categoria", categoria), ("titol", titol),
                                  ("linies", [])])
            fitxes.append(actual)
            camp = "descripcio"
            continue
        camp = camp_de(net) or camp
        if actual:
            actual["linies"].append(net)

    return fitxes


CONTINUA = re.compile(r"[,;:(-]$|\b(el|la|los|las|un|una|de|del|que|se|"
                      r"y|o|a|en|con|por|para|su|sus|lo|al|es|no)$", re.IGNORECASE)
LLISTA = re.compile(r"^([-*•]|\d{1,2}[.)]|[a-z][.)]|.?[A-Z¿])")


def uneix(linies):
    """Refa els paragrafs que `pdftotext` ha trencat linia a linia."""
    blocs, buf = [], []
    for linia in linies:
        if buf and (LLISTA.match(linia) and not CONTINUA.search(buf[-1])
                    and buf[-1].endswith((".", "?", "!", '"'))):
            blocs.append(" ".join(buf))
            buf = []
        buf.append(linia)
    if buf:
        blocs.append(" ".join(buf))
    text = "\n\n".join(re.sub(r"\s+", " ", b).strip() for b in blocs)
    return neteja(text)


def neteja(text):
    """Cometes i guions tipografics -> els equivalents del cataleg."""
    for a, b in (("‘", "'"), ("’", "'"), ("“", '"'),
                 ("”", '"'), ("–", "-"), ("—", "-")):
        text = text.replace(a, b)
    return text.strip()


def paragrafs(linies):
    """Agrupa les linies en camps: {camp: text}, respectant l'ordre d'aparicio."""
    camps = OrderedDict()
    actual = "descripcio"
    for linia in linies:
        camp = camp_de(linia)
        if camp:
            actual = camp
            continue
        camps.setdefault(actual, []).append(linia)
    return OrderedDict((k, uneix(v)) for k, v in camps.items() if uneix(v))


ACRONIM = re.compile(r"^[A-Z]{2,5}[.)]?$")


def titlecase(text):
    """Com el de `extract_pdf`, pero conserva les sigles (PNI, PNL...)."""
    text = neteja(re.sub(r"\s+", " ", text))
    suspensius = "..." if text.rstrip().endswith("...") else ""
    mots = text.strip(" .:;-").split()
    sortida = []
    for i, m in enumerate(mots):
        if ACRONIM.match(m):
            sortida.append(m)
        elif i and m.lower() in MINOR_WORDS:
            sortida.append(m.lower())
        else:
            sortida.append(capitalitza(m.lower()))
    net = " ".join(sortida) + suspensius
    return TITOLS.get(net, net)


def extracte(text, maxim=180):
    frase = re.split(r"(?<=[.!?])\s", text.strip())[0] if text.strip() else ""
    return frase if len(frase) <= maxim else frase[:maxim].rsplit(" ", 1)[0] + "..."


def fitxa(cru, vistos):
    camps = paragrafs(cru["linies"])
    descripcio = camps.get("descripcio", "")
    if len(descripcio) < 80:
        return None

    titol = titlecase(cru["titol"])
    slug = slugify(titol)
    vistos[slug] = vistos.get(slug, 0) + 1
    if vistos[slug] > 1:
        slug = "%s-%d" % (slug, vistos[slug])

    blob = " ".join([titol] + list(camps.values()))
    materials = guess_materials(camps, descripcio)
    etiquetes = set(autotag(blob))
    if not materials:
        etiquetes.add("sense-material")
    if camps.get("avaluacio"):
        etiquetes.add("reflexio")

    return OrderedDict([
        ("id", slug),
        ("titol", titol),
        ("categoria", cru["categoria"]),
        ("etiquetes", sorted(etiquetes)),
        ("durada", guess_duration(blob)),
        ("grup", guess_group_size(blob)),
        ("materials", materials),
        ("resum", camps.get("resum", "") or extracte(camps.get("objectius", ""))),
        ("objectius", camps.get("objectius", "")),
        ("participants", ""),
        ("espai", ""),
        ("preparacio", ""),
        ("consignes", ""),
        ("descripcio", descripcio),
        ("avaluacio", camps.get("avaluacio", "")),
        ("notes", camps.get("notes", "")),
        ("font", FONT),
    ])


def build(pdf, outdir, exclou=REPETIDES):
    vistos = {}
    fitxes = []
    descartades = []
    for cru in talla(text_del_pdf(pdf)):
        f = fitxa(cru, vistos)
        if not f:
            continue
        if f["id"] in exclou:
            descartades.append((f["titol"], exclou[f["id"]]))
        else:
            fitxes.append(f)

    os.makedirs(outdir, exist_ok=True)
    per_categoria = OrderedDict()
    for f in fitxes:
        per_categoria.setdefault(f["categoria"], []).append(f)

    for categoria, noves in sorted(per_categoria.items()):
        ruta = os.path.join(outdir, "%s.json" % categoria)
        antigues = []
        if os.path.exists(ruta):
            with open(ruta, encoding="utf-8") as fh:
                antigues = [d for d in json.load(fh) if d.get("font") != FONT]
        items = antigues + noves
        items.sort(key=lambda x: strip_accents(x["titol"]).lower())
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(items, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    print("Tecniques del manual: %d" % len(fitxes))
    for categoria, items in sorted(per_categoria.items()):
        print("  %-16s %4d" % (categoria, len(items)))
    if descartades:
        print("\n%d repetides, no incorporades:" % len(descartades))
        for titol, motiu in descartades:
            print("  %-34s ja hi es com a %s" % (titol, motiu))
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
