#!/usr/bin/env python3
"""Tradueix del castella al catala els textos de `data/dinamiques/*.json`.

Els fitxers originals no es toquen: la traduccio es desa a
`data/traduccions/ca/<fitxer>.json` amb la forma

    { "<id-de-la-dinamica>": { "_signatura": "...", "titol": "...", ... } }

Aixi el cataleg conserva les dues llengues i `scripts/build-data.mjs` pot
generar un bundle bilingue.

El motor de traduccio es Apertium (https://apertium.org), lliure i amb el
parell castella-catala com un dels seus millors. La feina es incremental: si
el text original no ha canviat, l'entrada ja traduida es reaprofita, de manera
que es pot aturar i reprendre el proces sense perdre res.

    python scripts/tradueix-ca.py            # tradueix el que falti
    python scripts/tradueix-ca.py --refes    # torna a traduir-ho tot
    python scripts/tradueix-ca.py atencio    # nomes els fitxers indicats
"""
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ARREL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(ARREL, 'data', 'dinamiques')
DESTI = os.path.join(ARREL, 'data', 'traduccions', 'ca')

API = 'https://www.apertium.org/apy/translate'
PARELL = 'spa|cat'

CAMPS = ['titol', 'materials', 'resum', 'objectius', 'participants', 'espai',
         'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes']

SEPARADOR = '@@@@@'
TALL = '\n' + SEPARADOR + '\n'
MAX_PETICIO = 4000      # caracters per peticio
PAUSA = 0.6             # segons entre peticions
REINTENTS = 5


# Apertium marca amb `#` o `@` les paraules que no ha sabut generar o traduir.
# Els originals no fan servir cap dels dos caracters, aixi que es poden treure.
MARQUES = re.compile(r'(?<![\w])[#@](?=[\wÀ-ÿ])')

# Mots que Apertium deixa tal qual, gairebe tots d'us americà: les obres del
# cataleg venen de Mexic i de l'America Central i del Sud i en fan servir uns
# quants. La substitucio es per paraula sencera i respecta la majuscula
# inicial.
GLOSSARI = {
    'afiche': 'cartell', 'afiches': 'cartells',
    'papelógrafo': 'paperògraf', 'papelógrafos': 'paperògrafs',
    'rotafolio': 'paperògraf', 'rotafolios': 'paperògrafs',
    'pizarrón': 'pissarra', 'pizarrones': 'pissarres',
    'franelógrafo': 'franel·lògraf',
    'mimeógrafo': 'multicopista',
    'crayolas': 'ceres de colors',
    'cartoncillo': 'cartolina',
    'acápites': 'apartats',
    'completamiento': 'completament',
    'jurado': 'jurat', 'jurados': 'jurats',
    'lanchero': 'barquer',
    'autoimagen': 'autoimatge',
}
MOTS = re.compile(r'\b(' + '|'.join(sorted(GLOSSARI, key=len, reverse=True)) + r')\b',
                  re.IGNORECASE)


def tradueix_mot(m):
    original = m.group(0)
    catala = GLOSSARI[original.lower()]
    return catala[0].upper() + catala[1:] if original[0].isupper() else catala


def neteja(text):
    return MOTS.sub(tradueix_mot, MARQUES.sub('', text)).strip()


def signatura(dinamica):
    cru = ''.join(str(dinamica.get(c) or '') for c in CAMPS)
    return hashlib.sha1(cru.encode('utf-8')).hexdigest()[:16]


def demana(text):
    """Una peticio a Apertium, amb reintents i espera creixent."""
    dades = urllib.parse.urlencode({
        'langpair': PARELL, 'markUnknown': 'no', 'q': text,
    }).encode('utf-8')
    espera = 2
    for intent in range(REINTENTS):
        try:
            peticio = urllib.request.Request(
                API, data=dades,
                headers={'User-Agent': 'tutoriaid/1.0 (traduccio del cataleg)'})
            with urllib.request.urlopen(peticio, timeout=60) as resposta:
                cos = json.load(io.TextIOWrapper(resposta, encoding='utf-8'))
            return cos['responseData']['translatedText']
        except Exception as error:              # xarxa, quota o resposta rara
            if intent == REINTENTS - 1:
                raise
            print('    reintent %d (%s)' % (intent + 1, error), flush=True)
            time.sleep(espera)
            espera *= 2
    raise RuntimeError('inabastable')


def tradueix_segments(segments):
    """Tradueix una llista de textos conservant-ne l'ordre i la mida."""
    resultat = [None] * len(segments)
    estat = {'tanda': [], 'mida': 0, 'indexos': []}

    def buida():
        if not estat['tanda']:
            return
        traduit = demana(TALL.join(estat['tanda']))
        trossos = [t.strip('\n') for t in
                   re.split(r'\n?' + re.escape(SEPARADOR) + r'\n?', traduit)]
        if len(trossos) != len(estat['tanda']):
            # La tanda ha perdut algun separador: es tradueix segment a segment.
            trossos = [demana(t).strip('\n') for t in estat['tanda']]
        for pos, text in zip(estat['indexos'], trossos):
            resultat[pos] = text
        estat['tanda'], estat['mida'], estat['indexos'] = [], 0, []
        time.sleep(PAUSA)

    for i, text in enumerate(segments):
        if estat['mida'] + len(text) > MAX_PETICIO and estat['tanda']:
            buida()
        estat['tanda'].append(text)
        estat['indexos'].append(i)
        estat['mida'] += len(text) + len(TALL)
    buida()
    return resultat


def tradueix_fitxer(nom, refes):
    orig = os.path.join(ORIGEN, nom)
    desti = os.path.join(DESTI, nom)
    with open(orig, encoding='utf-8') as fitxer:
        dinamiques = json.load(fitxer)

    previ = {}
    if os.path.exists(desti) and not refes:
        with open(desti, encoding='utf-8') as fitxer:
            previ = json.load(fitxer)

    sortida = {}
    segments, ubicacions = [], []
    for d in dinamiques:
        # Les fitxes escrites directament en catala no passen per Apertium.
        if d.get('idioma') == 'ca':
            continue
        firma = signatura(d)
        anterior = previ.get(d['id'])
        if anterior and anterior.get('_signatura') == firma:
            sortida[d['id']] = anterior
            continue
        sortida[d['id']] = {'_signatura': firma}
        for camp in CAMPS:
            valor = (d.get(camp) or '').strip()
            if not valor:
                continue
            segments.append(valor)
            ubicacions.append((d['id'], camp))

    if not segments:
        print('%-20s ja estava al dia (%d dinamiques)' % (nom, len(dinamiques)),
              flush=True)
        return 0

    print('%-20s %d segments, %d caracters' %
          (nom, len(segments), sum(len(s) for s in segments)), flush=True)
    traduits = tradueix_segments(segments)
    for (identificador, camp), text in zip(ubicacions, traduits):
        text = neteja(text or '')
        if text:
            sortida[identificador][camp] = text

    os.makedirs(DESTI, exist_ok=True)
    with open(desti, 'w', encoding='utf-8', newline='\n') as fitxer:
        json.dump(sortida, fitxer, ensure_ascii=False, indent=2, sort_keys=True)
        fitxer.write('\n')
    print('%-20s desat a data/traduccions/ca/%s' % ('', nom), flush=True)
    return len(segments)


def main():
    arguments = [a for a in sys.argv[1:] if not a.startswith('--')]
    refes = '--refes' in sys.argv[1:]

    fitxers = sorted(f for f in os.listdir(ORIGEN) if f.endswith('.json'))
    if arguments:
        volguts = set(a if a.endswith('.json') else a + '.json' for a in arguments)
        fitxers = [f for f in fitxers if f in volguts]

    total = 0
    for nom in fitxers:
        total += tradueix_fitxer(nom, refes)
    print('Fet: %d segments traduits.' % total, flush=True)


if __name__ == '__main__':
    main()
