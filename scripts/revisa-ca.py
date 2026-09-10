#!/usr/bin/env python3
"""Assenyala les fitxes catalanes que encara fan sospitar d'una mala traduccio.

No corregeix res: nomes puntua cada fitxa de `data/traduccions/ca/*.json` segons
els indicis que hi troba (castellanismes que hi queden, restes del «que esta»,
futurs girats en subjuntiu, frases calcades de l'original...) i llista les mes
tocades primer, amb el fragment que ho justifica. Serveix per decidir quines
fitxes cal repassar a ma.

    python scripts/revisa-ca.py            # les 40 fitxes mes sospitoses
    python scripts/revisa-ca.py --tot      # totes les que tenen algun indici
    python scripts/revisa-ca.py --json     # sortida per a altres eines
"""
import json
import os
import re
import sys

ARREL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(ARREL, 'data', 'dinamiques')
DESTI = os.path.join(ARREL, 'data', 'traduccions', 'ca')

CAMPS = ['titol', 'materials', 'resum', 'objectius', 'participants', 'espai',
         'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes']

# Indicis, amb el pes que se'ls dona. Com mes alt, mes segur es que la frase
# no s'enten.
INDICIS = [
    (4, 'demostratiu pel verb «estar»', re.compile(r"(?<![\wÀ-ÿ])aquest(a|es)? (?:en |al |aquí|allà|dins|fora|davant|darrere|amb )")),
    (3, 'castellanisme', re.compile(r"(?<![\wÀ-ÿ])(circulo|numero|ordenis|gana el|gana l'|deuen|agarr\w+|mes gran|mes petit|el mes |soltar|solta les|ultimo|papelografo|pañoleta|conexion|minutos|niños|mujer|otro|asi)(?![\wÀ-ÿ])", re.I)),
    (3, 'verb sense subjecte o mal girat', re.compile(r"(?<![\wÀ-ÿ])(va estar enter|sota va|es tendeix|tracta d'endevinar què és el que estan)")),
    (2, 'infinitiu castella', re.compile(r"(?<![\wÀ-ÿ])\w+(?:ando|iendo|arse|erse|irse)(?![\wÀ-ÿ])")),
    (2, 'pronom perdut', re.compile(r"(?<![\wÀ-ÿ])(pot fer amb|es pot fer amb noms|ha de asseure|de asseure)(?![\wÀ-ÿ])")),
    (2, 'complement directe amb «a»', re.compile(r"(?<![\wÀ-ÿ])(matar a|colpejar a|enxampar a|perseguir a|treure a l'|agafar a|veure a un|veure a una)(?![\wÀ-ÿ])")),
    (1, 'calc de «lo»', re.compile(r"(?<![\wÀ-ÿ])(el que més|allò que|el mateix que)(?![\wÀ-ÿ])")),
]

# Futurs castellans que Apertium ha convertit en subjuntiu: a l'original hi ha
# «-ara/-aran» (un futur mal accentuat) i aqui hi surt «-es/-essin». Nomes
# compta si l'arrel del mot catala i la del castella coincideixen.
FUTUR_CA = re.compile(r"(?<![\wÀ-ÿ])(\w{4,}(?:és|essin|ís|issin))(?![\wÀ-ÿ])")
FUTUR_ES = re.compile(r"(?<![\wÀ-ÿ])(\w{4,}(?:ara|aran|iera|ieran|ase|asen))(?![\wÀ-ÿ])")
NO_VERBS = {
    'després', 'procés', 'només', 'precís', 'país', 'interès', 'francès',
    'anglès', 'congrés', 'revés', 'través', 'cortès', 'espès', 'progrés',
    'accés', 'excés', 'succés', 'anàlisi', 'permís', 'compromís', 'avís',
    'pastís', 'paradís', 'matís', 'ingrés', 'divers', 'malmès',
}


def arrels(text, patro):
    return {m.group(1)[:4].lower() for m in patro.finditer(text)}


def carrega():
    fitxes = []
    for fitxer in sorted(f for f in os.listdir(ORIGEN) if f.endswith('.json')):
        with open(os.path.join(ORIGEN, fitxer), encoding='utf-8') as fh:
            originals = {d['id']: d for d in json.load(fh)}
        cami = os.path.join(DESTI, fitxer)
        if not os.path.exists(cami):
            continue
        with open(cami, encoding='utf-8') as fh:
            traduccions = json.load(fh)
        for _id, traduccio in traduccions.items():
            fitxes.append((fitxer, _id, originals.get(_id, {}), traduccio))
    return fitxes


def revisa(original, traduccio):
    """Torna (puntuacio, [(motiu, fragment)]) d'una fitxa."""
    punts = 0
    motius = []
    catala = '\n'.join(traduccio.get(c, '') for c in CAMPS)
    castella = '\n'.join(original.get(c, '') for c in CAMPS)
    for pes, motiu, patro in INDICIS:
        for m in patro.finditer(catala):
            punts += pes
            motius.append((motiu, catala[max(0, m.start() - 30):m.end() + 30].replace('\n', ' ')))
    arrels_es = arrels(castella, FUTUR_ES)
    if arrels_es:
        for m in FUTUR_CA.finditer(catala):
            mot = m.group(1).lower()
            if mot in NO_VERBS or mot[:4] not in arrels_es:
                continue
            punts += 3
            motius.append(('futur girat en subjuntiu',
                           catala[max(0, m.start() - 30):m.end() + 30].replace('\n', ' ')))
    return punts, motius


def main(argv):
    tot = '--tot' in argv
    com_json = '--json' in argv
    resultats = []
    for fitxer, _id, original, traduccio in carrega():
        punts, motius = revisa(original, traduccio)
        if punts:
            resultats.append({'fitxer': fitxer, 'id': _id, 'punts': punts,
                              'motius': motius[:6]})
    resultats.sort(key=lambda r: -r['punts'])
    if com_json:
        json.dump(resultats, sys.stdout, ensure_ascii=False, indent=2)
        return 0
    mostrats = resultats if tot else resultats[:40]
    for r in mostrats:
        print(f"\n{r['punts']:3d}  {r['fitxer']} · {r['id']}")
        for motiu, fragment in r['motius']:
            print(f'       {motiu}: …{fragment}…')
    print(f"\n{len(resultats)} fitxes amb indicis"
          + ('' if tot else f' (se n\'han mostrat {len(mostrats)})'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
