# -*- coding: utf-8 -*-
"""
Extractor del PDF font ("700 Dinamicas grupales") cap a JSON estructurat.

Us:
    python scripts/extract_pdf.py --pdf "700-Dinamicas-grupales.pdf" --out data/dinamiques

Requereix `pdftotext` (Xpdf o Poppler) al PATH.

El PDF es una recopilacio de quatre obres amb maquetacions diferents; cada una
te el seu propi parser. Vegeu docs/CONTRIBUTING-dinamiques.md per afegir
dinamiques noves a ma sense passar per aqui.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import OrderedDict

# --------------------------------------------------------------------------
# Fonts dins del PDF (rangs de pagina de pdftotext, 1-indexats)
# --------------------------------------------------------------------------
SOURCES = [
    dict(id="conocerse", first=2, last=8, columns=1,
         title="22 Juegos para conocerse",
         parser="caps_titles"),
    dict(id="animar", first=36, last=55, columns=2, keep_numbers=True,
         title="100 Formas de Animar Grupos (Alianza Internacional contra el VIH/SIDA, 2002)",
         parser="numbered_lower"),
    dict(id="integracion", first=57, last=199, columns=1,
         title="456 Juegos y Dinamicas de Integracion Grupal (Prof. Enrique Gonzalez)",
         parser="numbered_caps"),
    dict(id="juegosydinamicas", first=253, last=327, columns=1,
         title="Juegos y Dinamicas (recopilacio)",
         parser="caps_titles"),
]

RUNNING_HEADERS = (
    "456 juegos y dinamicas de integral grupal",
    "lic. educacion integral prof. enrique gonzalez",
    "juegos y dinamicas",
    "100 formas de animar grupos",
    "22 juegos para conocerse",
)


def strip_accents(text):
    return "".join(c for c in unicodedata.normalize("NFD", text)
                   if unicodedata.category(c) != "Mn")


# --------------------------------------------------------------------------
# Camps estructurats (etiqueta del PDF -> camp intern)
# --------------------------------------------------------------------------
FIELD_MAP = OrderedDict([
    ("definicion del juego", "resum"), ("definicion", "resum"),
    ("objetivos", "objectius"), ("objetivo", "objectius"),
    ("finalidad", "objectius"), ("proposito", "objectius"),
    ("materiales", "materials"), ("material", "materials"),
    ("implementos", "materials"), ("recursos", "materials"),
    ("numero de participantes", "participants"), ("participantes", "participants"),
    ("destinatarios", "participants"), ("edades", "participants"), ("edad", "participants"),
    ("consignas de partida", "consignes"), ("consignas", "consignes"),
    ("desarrollo del juego", "desenvolupament"), ("desarrollo", "desenvolupament"),
    ("metodologia", "desenvolupament"),
    ("reglas", "desenvolupament"), ("procedimiento", "desenvolupament"),
    ("instrucciones", "desenvolupament"),
    ("preparacion", "preparacio"), ("organizacion", "preparacio"),
    ("lugar de realizacion", "espai"), ("lugar", "espai"),
    ("espacio", "espai"), ("terreno", "espai"),
    ("duracion", "durada_text"), ("tiempo", "durada_text"),
    ("evaluacion", "avaluacio"), ("reflexion", "avaluacio"),
    ("observaciones", "notes"), ("observacion", "notes"),
    ("notas", "notes"), ("nota", "notes"),
    ("variantes", "notes"), ("variante", "notes"),
    ("consejos", "notes"), ("tipo de juego", "notes"),
])

_LABELS = "|".join(sorted((re.escape(k) for k in FIELD_MAP), key=len, reverse=True))
LABEL_ONLY_RE = re.compile(r"^(" + _LABELS + r")\s*:?\s*$", re.IGNORECASE)
FIELD_RE = re.compile(r"^(" + _LABELS + r")\s*:\s*", re.IGNORECASE)
INLINE_COLON_RE = re.compile(r"(?<![A-Za-z])(" + _LABELS + r")\s*:", re.IGNORECASE)
INLINE_CAPS_RE = re.compile(r"(?<![A-Za-z])(" + _LABELS + r")(?=\s)", re.IGNORECASE)


def label_of(text):
    """Retorna el camp intern si `text` es una etiqueta coneguda, si no None."""
    m = LABEL_ONLY_RE.match(strip_accents(text).strip())
    return FIELD_MAP[m.group(1).lower()] if m else None


# --------------------------------------------------------------------------
# Normalitzacio de pagines
# --------------------------------------------------------------------------
def find_gutter(lines):
    """Columna de separacio entre dues columnes de text, o None."""
    body = [l for l in lines if l.strip()]
    if len(body) < 8:
        return None
    width = max(len(l) for l in body)
    if width < 70:
        return None
    hits = [0] * (width + 2)
    for line in body:
        for i, ch in enumerate(line):
            if ch != " ":
                hits[i] += 1
    best = None
    run = start = 0
    for i in range(int(width * 0.30), int(width * 0.75)):
        if hits[i] == 0:
            if run == 0:
                start = i
            run += 1
            if best is None or run > best[1]:
                best = (start, run)
        else:
            run = 0
    return None if best is None else best[0] + best[1] // 2


def is_noise(line, keep_numbers=False):
    s = line.strip()
    if not s:
        return False
    if strip_accents(s).lower().rstrip(":. ") in RUNNING_HEADERS:
        return True
    if not keep_numbers and re.fullmatch(r"\d{1,3}", s):
        return True
    if re.fullmatch(r"[-_=.•\s]+", s):
        return True
    return False


def page_text(page, columns, keep_numbers=False):
    raw = page.split("\n")
    blocks = [raw]
    if columns == 2:
        cut = find_gutter(raw)
        if cut:
            blocks = [[l[:cut].rstrip() for l in raw], [l[cut:].rstrip() for l in raw]]
    return "\n".join(l.rstrip() for block in blocks for l in block
                     if not is_noise(l, keep_numbers))


def source_text(pdf, src):
    cmd = ["pdftotext", "-layout", "-enc", "UTF-8",
           "-f", str(src["first"]), "-l", str(src["last"]), pdf, "-"]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.decode("utf-8", "replace"))
    pages = res.stdout.decode("utf-8", "replace").split("\f")
    keep = src.get("keep_numbers", False)
    return "\n".join(page_text(p, src["columns"], keep) for p in pages)


# --------------------------------------------------------------------------
# Neteja de cos de text
# --------------------------------------------------------------------------
DEHYPHEN = re.compile(r"(\w)-\n(\w)")
LIST_START_RE = re.compile(r"^([-*•]|\d{1,2}[.)–-]|[a-z][.)–-])\s")


def clean_body(raw):
    text = raw.replace("‘", "'").replace("’", "'")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"[ \t]+", " ", text)

    paragraphs, buf = [], []

    def flush():
        if buf:
            paragraphs.append(" ".join(buf))
            del buf[:]

    for line in (l.strip() for l in text.split("\n")):
        if not line:
            flush()
            continue
        # etiqueta sola a la seva linia ("DESARROLLO") -> marcador de camp
        if label_of(line):
            flush()
            buf.append(line.rstrip(": ") + ":")
            continue
        if buf and LIST_START_RE.match(line):
            flush()
        buf.append(line)
    flush()

    out = []
    for p in paragraphs:
        p = re.sub(r"\s+", " ", DEHYPHEN.sub(r"\1\2", p)).strip()
        if p:
            out.append(p)
    return "\n\n".join(out)


def explode_labels(para):
    """Talla un paragraf alli on apareix una etiqueta de camp coneguda.

    El PDF font sovint escriu `OBJETIVO: ... DESARROLLO: ...` dins d'una mateixa
    linia, amb o sense dos punts.
    """
    probe = strip_accents(para)
    if len(probe) != len(para):
        return [para]
    cuts = {0}
    inserts = {}
    for m in INLINE_COLON_RE.finditer(probe):
        if m.start() and para[m.start()].isupper():
            cuts.add(m.start())
    for m in INLINE_CAPS_RE.finditer(probe):
        token = para[m.start():m.end()]
        if m.start() and token.isupper() and len(token) >= 5:
            cuts.add(m.start())
            inserts[m.start()] = m.end() - m.start()
    ordered = sorted(cuts) + [len(para)]
    parts = []
    for a, b in zip(ordered, ordered[1:]):
        chunk = para[a:b]
        if a in inserts:                       # afegeix els dos punts que faltaven
            n = inserts[a]
            chunk = chunk[:n] + ":" + chunk[n:]
        chunk = chunk.strip()
        if chunk:
            parts.append(chunk)
    return parts


def split_fields(body):
    """Separa el cos en camps reconeguts + text lliure restant."""
    fields, rest = {}, []
    current = None
    paragraphs = []
    for chunk in body.split("\n\n"):
        paragraphs.extend(explode_labels(chunk))
    for para in paragraphs:
        m = FIELD_RE.match(strip_accents(para))
        if m:
            key = FIELD_MAP[m.group(1).lower()]
            value = para[m.end():].strip()
            current = key
            fields[key] = (fields[key] + "\n\n" + value).strip() if key in fields else value
            continue
        if current and current != "desenvolupament":
            fields[current] = (fields[current] + "\n\n" + para).strip()
        else:
            current = None
            rest.append(para)
    return fields, "\n\n".join(rest).strip()


# --------------------------------------------------------------------------
# Parsers per font
# --------------------------------------------------------------------------
CAPS_STOPWORDS = {
    "indice", "dinamicas", "juegos", "dinamica", "juego", "ejemplo",
    "primera etapa", "segunda etapa", "tercera etapa", "cuarta etapa",
    "estructura del ejercicio", "lo que se espera", "otros posibles usos",
    "algunas dificultades", "variantes", "desarrollo", "reglas", "objetivo",
    "objetivos", "material", "materiales", "participantes", "definicion",
    "consignas de partida", "evaluacion", "observaciones", "notas",
}


ORDINALS = str.maketrans("", "", "ºª°")


def is_caps_title(line):
    s = line.strip().rstrip(":")
    if not (3 <= len(s) <= 75):
        return False
    if re.search(r"\.{3,}", s):          # linia de l'index ("TITOL ....... 25")
        return False
    if strip_accents(s).lower() in CAPS_STOPWORDS or label_of(s):
        return False
    letters = [c for c in s.translate(ORDINALS) if c.isalpha()]
    if len(letters) < 3 or any(c.islower() for c in letters):
        return False
    return not re.match(r"^\d", s)


def parse_caps_titles(text, section_headings):
    """Titols en majuscules a linia propia."""
    lines = text.split("\n")
    items, state = [], {"cat": None, "title": None, "buf": []}

    def flush():
        if state["title"]:
            items.append((state["cat"], state["title"], "\n".join(state["buf"])))

    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        probe = strip_accents(stripped).rstrip(":").lower()
        if probe in section_headings:
            flush()
            state.update(title=None, buf=[], cat=stripped.rstrip(":"))
            i += 1
            continue
        if is_caps_title(lines[i]):
            full = stripped.rstrip(":")
            j = i + 1
            if len(full) > 28 and j < len(lines) and is_caps_title(lines[j]) \
                    and strip_accents(lines[j].strip()).rstrip(":").lower() not in section_headings:
                full += " " + lines[j].strip().rstrip(":")
                j += 1
            flush()
            state.update(title=full, buf=[])
            i = j
            continue
        if state["title"]:
            state["buf"].append(lines[i])
        i += 1
    flush()
    return items


NUM_CAPS_RE = re.compile(r"^\s{0,6}(\d{1,3})\.\s*([^\n]+)$")


def parse_numbered_caps(text, section_headings):
    """Format `12. TITOL: descripcio`."""
    lines = text.split("\n")
    items, state = [], {"cat": None, "title": None, "buf": [], "next": 1}

    def flush():
        if state["title"]:
            items.append((state["cat"], state["title"], "\n".join(state["buf"])))

    for line in lines:
        stripped = line.strip()
        probe = strip_accents(stripped).rstrip(":").lower()
        if probe in section_headings:
            flush()
            state.update(title=None, buf=[], cat=stripped.rstrip(":"))
            continue
        m = NUM_CAPS_RE.match(line)
        if m and int(m.group(1)) == state["next"]:
            flush()
            state["next"] += 1
            rest = m.group(2).strip()
            head, sep, tail = rest.partition(":")
            if sep and len(head) <= 80:
                state.update(title=head.strip(), buf=[tail.strip()])
            else:
                state.update(title=" ".join(rest.split()[:8]), buf=[rest])
            continue
        if state["title"]:
            state["buf"].append(line)
    flush()
    return items


NUM_LOWER_RE = re.compile(r"^\s*(\d{1,3})\s+(\S.*)$")


def parse_numbered_lower(text, section_headings):
    """Format `12 titol en minuscules` (100 Formas de Animar Grupos)."""
    lines = text.split("\n")
    items, state = [], {"title": None, "buf": [], "next": 1}

    def flush():
        if state["title"]:
            items.append((None, state["title"], "\n".join(state["buf"])))

    def continuation(k):
        """Segona linia del titol, quan hi continua."""
        if k >= len(lines):
            return None
        nxt = lines[k].strip()
        if nxt and len(nxt) < 30 and not nxt[0].isdigit() and not nxt.endswith("."):
            return nxt
        return None

    i = 0
    while i < len(lines):
        bare = re.fullmatch(r"\s*(\d{1,3})\s*", lines[i])
        m = NUM_LOWER_RE.match(lines[i])
        if bare and int(bare.group(1)) == state["next"]:
            # el numero i el titol han quedat en linies separades
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            title = lines[j].strip() if j < len(lines) else ""
            if title and not title[0].isdigit() and len(title) <= 60:
                flush()
                state.update(title=title, buf=[], next=state["next"] + 1)
                i = j + 1
                continue
        elif m and int(m.group(1)) == state["next"]:
            flush()
            title = m.group(2).strip()
            i += 1
            if len(title) < 28:
                cont = continuation(i)
                if cont:
                    title += " " + cont
                    i += 1
            state.update(title=title, buf=[], next=state["next"] + 1)
            continue
        if state["title"]:
            state["buf"].append(lines[i])
        i += 1
    flush()
    return items


PARSERS = {
    "caps_titles": parse_caps_titles,
    "numbered_caps": parse_numbered_caps,
    "numbered_lower": parse_numbered_lower,
}

# Capcaleres de seccio del PDF -> categoria interna de l'aplicacio
SECTION_HEADINGS = {
    "dinamicas para fomentar las relaciones humanas": "relacions",
    "juegos de atencion y memorizacion": "atencio",
    "juegos de fluidez verbal": "comunicacio",
    "juegos al aire libre": "aire-lliure",
    "dinamicas rompe hielo": "trencagel",
    "dinamicas de intermedio": "distensio",
    "dinamicas para conocerse entre si": "coneixement",
    "dinamicas de afirmacion": "afirmacio",
    "dinamicas de confianza": "confianca",
    "dinamicas para fomentar la cooperacion": "cooperacio",
    "juegos en el autobus": "autobus",
    "juegos de distension": "distensio",
    "dinamicas de animacion y calentamiento grupal": "animacio",
    "juegos en la naturaleza": "aire-lliure",
    "juegos de comunicacion": "comunicacio",
    "juegos de penitencia": "distensio",
    "juegos dirigidos": "distensio",
    "dinamicas de integracion grupal": "cohesio",
    "dinamicas y juegos de presentacion": "presentacio",
    "juegos de presentacion": "presentacio",
    "juegos recreativos": "distensio",
    "dinamicas varias": "varies",
    "dinamicas de valores": "valors",
    "dinamicas de comunicacion": "comunicacio",
    "actividades sobre la familia": "valors",
    "juegos de afirmacion": "afirmacio",
    "juegos de confianza": "confianca",
    "juegos de resolucion de conflitos": "conflictes",
    "juegos de resolucion de conflictos": "conflictes",
    "grandes juegos": "aire-lliure",
    "juegos para veladas": "vetllades",
    "juegos nocturnos": "vetllades",
    "talleres": "tallers",
    "jocs per equips": "cooperacio",
}

DEFAULT_CATEGORY = {
    "conocerse": "presentacio",
    "animar": "animacio",
    "integracion": "cohesio",
    "juegosydinamicas": "varies",
}


# --------------------------------------------------------------------------
# Etiquetatge automatic
# --------------------------------------------------------------------------
TAG_RULES = [
    ("moviment", r"corre[rn]|carrera|salta|persegui|desplaza|caminar|bail"),
    ("cercle", r"circulo|\bronda\b|\brueda\b"),
    ("parelles", r"\bparejas?\b"),
    ("subgrups", r"\bequipos?\b|subgrupos?|grupos peque"),
    ("silenci", r"\bsilencio\b|sin hablar|no pueden hablar"),
    ("escriptura", r"escrib|\bpapel\b|boligraf|\blapiz\b|\bfolio\b"),
    ("expressio-corporal", r"\bmim|\bgesto|expresion corporal|representa"),
    ("reflexio", r"reflexi|\bdebate\b|puesta en comun|evaluacion|conclusi"),
    ("emocions", r"sentimiento|emocion|\bmiedo\b|\bconfianza\b"),
    ("interior", r"\bsalon\b|\baula\b|\bsala\b|\binterior\b"),
    ("exterior", r"\bpatio\b|aire libre|\bexterior\b|\bcampo\b|naturaleza|\bbosque\b"),
    ("memoria", r"memoriz|\bmemoria\b|recordar"),
    ("atencio", r"\batencion\b|concentracion|reflejos"),
    ("competitiu", r"\bgana\b|ganador|\bpierde\b|competen|\bpuntos?\b"),
    ("cooperatiu", r"colabora|cooperar|\bjuntos\b|equipo debe|ayudar"),
    ("musica", r"\bmusica\b|\bcancion\b|\bcanta"),
    ("ulls-tapats", r"\bvenda\b|ojos vendados|ojos cerrados|ojos tapados|a ciegas"),
]

MATERIAL_HINTS = (r"\b(pelota|balon|silla|papel|papeles|lapiz|boligrafo|marcador|tarjeta|"
                  r"cartulina|venda|panuelo|cuerda|tiza|globo|periodico|revista|alfiler|"
                  r"tijera|caja|reloj|musica|radio|pizarra|folio|sombrero|botella|moneda|"
                  r"dado|naipe|carta)\b")

MATERIAL_CA = {
    "pelota": "pilota", "balon": "pilota", "silla": "cadires", "papel": "paper",
    "papeles": "paper", "lapiz": "llapis", "boligrafo": "boligraf",
    "marcador": "retolador", "tarjeta": "targetes", "cartulina": "cartolina",
    "venda": "bena", "panuelo": "mocador", "cuerda": "corda", "tiza": "guix",
    "globo": "globus", "periodico": "diari", "revista": "revistes",
    "alfiler": "agulles", "tijera": "tisores", "caja": "capsa", "reloj": "rellotge",
    "musica": "musica", "radio": "equip de so", "pizarra": "pissarra",
    "folio": "fulls", "sombrero": "barret", "botella": "ampolla",
    "moneda": "moneda", "dado": "daus", "naipe": "cartes", "carta": "cartes",
}


def autotag(blob):
    text = strip_accents(blob).lower()
    tags = {tag for tag, rule in TAG_RULES if re.search(rule, text)}
    if "interior" in tags and "exterior" in tags:
        tags.discard("interior")
    return sorted(tags)


NO_MATERIAL_RE = re.compile(
    r"^(ninguno|ninguna|nada|no|sin material|no se necesita[n]?|no precisa|"
    r"no hace falta|no requiere|-{1,3})\b[\s.,;]*$", re.IGNORECASE)


def guess_materials(fields, body):
    if fields.get("materials"):
        value = re.sub(r"\s+", " ", fields["materials"]).strip()
        return "" if NO_MATERIAL_RE.match(strip_accents(value)) else value
    found = []
    for m in re.finditer(MATERIAL_HINTS, strip_accents(body).lower()):
        ca = MATERIAL_CA.get(m.group(1), m.group(1))
        if ca not in found:
            found.append(ca)
    return ", ".join(sorted(found))


def guess_duration(blob):
    minutes = [int(m.group(1)) for m in re.finditer(r"(\d{1,3})\s*minutos", blob)]
    if minutes:
        return max(5, min(60, max(minutes) + 10))
    words = len(blob.split())
    if words < 90:
        return 10
    if words < 200:
        return 20
    if words < 400:
        return 30
    return 45


def guess_group_size(blob):
    joined = strip_accents(blob).lower()
    nums = [int(m.group(1)) for m in re.finditer(
        r"(\d{1,3})\s*(?:o mas\s*)?(?:personas|participantes|jugadores|alumnos)", joined)]
    top = max(nums) if nums else 0
    if top >= 30 or "grupo grande" in joined or "grupos numerosos" in joined:
        return "gran"
    if top and top <= 12:
        return "petit"
    return "mitja"


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", strip_accents(text).lower()).strip("-")
    return s[:60] or "dinamica"


MINOR_WORDS = {"de", "del", "la", "el", "los", "las", "y", "en", "a", "al", "con",
               "para", "por", "un", "una", "que", "se", "lo", "mi", "su", "e", "o"}


def capitalitza(word):
    """Posa en majuscula la primera lletra, saltant-se signes com ¡ o ¿."""
    for i, ch in enumerate(word):
        if ch.isalpha():
            return word[:i] + ch.upper() + word[i + 1:]
    return word


def titlecase(text):
    words = text.lower().split()
    return " ".join(w if (i and w in MINOR_WORDS) else capitalitza(w)
                    for i, w in enumerate(words))


# --------------------------------------------------------------------------
def build(pdf, outdir):
    headings = {strip_accents(k): v for k, v in SECTION_HEADINGS.items()}
    records, seen = [], {}

    for src in SOURCES:
        text = source_text(pdf, src)
        for category_label, title, body_raw in PARSERS[src["parser"]](text, set(headings)):
            body = clean_body(body_raw)
            if len(body) < 60:
                continue
            fields, rest = split_fields(body)
            chunks = [c for c in (fields.pop("desenvolupament", ""), rest) if c]
            description = "\n\n".join(chunks).strip()
            if len(description) < 60:
                donor = max((k for k in fields if k not in ("materials", "durada_text")),
                            key=lambda k: len(fields[k]), default=None)
                if donor and len(fields[donor]) >= 60:
                    description = fields.pop(donor)
            if len(description) < 60:
                continue

            clean_title = titlecase(re.sub(r"\s+", " ", title).strip(" .:;-"))
            if len(clean_title) < 3:
                continue

            category = (headings.get(strip_accents(category_label).lower())
                        if category_label else None) or DEFAULT_CATEGORY[src["id"]]

            slug = slugify(clean_title)
            seen[slug] = seen.get(slug, 0) + 1
            if seen[slug] > 1:
                slug = "%s-%d" % (slug, seen[slug])

            blob = " ".join([clean_title, description] + list(fields.values()))
            materials = guess_materials(fields, description)
            tags = autotag(blob)
            if not materials:
                tags = sorted(set(tags) | {"sense-material"})

            records.append(OrderedDict([
                ("id", slug),
                ("titol", clean_title),
                ("categoria", category),
                ("etiquetes", tags),
                ("durada", guess_duration(blob)),
                ("grup", guess_group_size(blob)),
                ("materials", materials),
                ("resum", fields.get("resum", "")),
                ("objectius", fields.get("objectius", "")),
                ("participants", fields.get("participants", "")),
                ("espai", fields.get("espai", "")),
                ("preparacio", fields.get("preparacio", "")),
                ("consignes", fields.get("consignes", "")),
                ("descripcio", description),
                ("avaluacio", fields.get("avaluacio", "")),
                ("notes", fields.get("notes", "")),
                ("font", src["title"]),
            ]))

    os.makedirs(outdir, exist_ok=True)
    by_cat = OrderedDict()
    for r in records:
        by_cat.setdefault(r["categoria"], []).append(r)

    for cat, items in sorted(by_cat.items()):
        items.sort(key=lambda x: strip_accents(x["titol"]).lower())
        with open(os.path.join(outdir, "%s.json" % cat), "w", encoding="utf-8") as fh:
            json.dump(items, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    print("Dinamiques extretes: %d" % len(records))
    for cat, items in sorted(by_cat.items()):
        print("  %-14s %4d" % (cat, len(items)))
    return records


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
