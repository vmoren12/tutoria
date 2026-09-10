#!/usr/bin/env python3
"""Esmena sistematicament el catala de `data/traduccions/ca/*.json`.

La traduccio automatica (Apertium, `scripts/tradueix-ca.py`) deixa un rastre
d'errors sempre iguals: castellanismes que no va saber girar, el complement
directe amb la preposicio «a», el «per a» davant d'infinitiu, paraules que el
PDF original havia partit i, sobretot, el «que aquesta» que surt de l'«esta»
sense accent dels originals. Aquest fitxer recull aquestes esmenes en regles
i les aplica a tot el cataleg.

Es idempotent: es pot executar tantes vegades com calgui i nomes toca allo que
encara no esta esmenat. Les esmenes fetes a ma dins dels JSON no es desfan,
perque cada regla nomes actua sobre la forma incorrecta.

    python scripts/esmena-ca.py             # esmena tot el cataleg
    python scripts/esmena-ca.py --prova     # nomes informa, no desa res
    python scripts/esmena-ca.py atencio     # nomes els fitxers indicats
"""
import json
import os
import re
import sys

ARREL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTI = os.path.join(ARREL, 'data', 'traduccions', 'ca')

CAMPS = ['titol', 'materials', 'resum', 'objectius', 'participants', 'espai',
         'preparacio', 'consignes', 'descripcio', 'avaluacio', 'notes']


# ---------------------------------------------------------------------------
# 1. Lexic: mots que Apertium va deixar en castella (molts, d'us america) i
#    mots partits pel salt de linia del PDF original.
# ---------------------------------------------------------------------------
GLOSSARI = {
    # castellanismes lexics
    'conexion': 'connexió', 'conexiones': 'connexions',
    'minutos': 'minuts', 'segundero': 'segoner',
    'pañoleta': 'mocador', 'pañoletas': 'mocadors',
    'pizarrón': 'pissarra', 'pizarrones': 'pissarres',
    'papelografo': 'paperògraf', 'papelógrafo': 'paperògraf',
    'papelógrafos': 'paperògrafs', 'rotafolio': 'paperògraf',
    'crayolas': 'ceres de colors', 'gis': 'guix', 'gises': 'guixos',
    'concretación': 'concreció', 'sociabilización': 'socialització',
    'masculinización': 'masculinització', 'numerificación': 'numeració',
    'metacognicion': 'metacognició', 'autoobservacion': 'autoobservació',
    'orientacion': 'orientació', 'concientizar': 'conscienciar',
    'concientizarse': 'conscienciar-se', 'empatizar': 'empatitzar',
    'cotidianeidad': 'quotidianitat', 'grupalmente': 'en grup',
    'universidades': 'universitats', 'contenidos': 'continguts',
    'educativos': 'educatius', 'conflictos': 'conflictes',
    'escuela': 'escola', 'mujer': 'dona', 'niños': 'nens', 'otro': 'altre',
    'silaba': 'síl·laba', 'reves': 'revés', 'reir': 'riure', 'asi': 'així',
    'difcil': 'difícil', 'últimno': 'últim', 'auque': 'encara que',
    'talvez': 'potser', 'recibiran': 'rebran', 'leera': 'llegirà',
    'tienee': 'té', 'faciltador': 'facilitador', 'recetor': 'receptor',
    'boligraf': 'bolígraf', 'grafica': 'gràfica', 'basquetbol': 'bàsquet',
    'básquetbol': 'bàsquet', 'baseball': 'beisbol', 'futbolito': 'futbolí',
    'puntaje': 'puntuació', 'ptos': 'punts', 'mts': 'm',
    'dptos': 'departaments', 'preuniversitarios': 'preuniversitaris',
    'teletrabajador': 'teletreballador', 'teletrabajadores': 'teletreballadors',
    'teletrabajar': 'teletreballar', 'cibertrabajo': 'cibertreball',
    'coleccionador': 'col·leccionista', 'adivinador': 'endevinaire',
    'golpeador': 'colpejador', 'chutador': 'xutador', 'silbador': 'xiulador',
    'sabuesos': 'gossos rastrejadors', 'grullas': 'grues',
    'cochino': 'porc', 'marranito': 'porquet', 'pirañas': 'piranyes',
    'pececillos': 'peixets', 'lobato': 'llobató', 'lobatos': 'llobatons',
    'frijoles': 'mongetes', 'fríjol': 'mongeta', 'potaje': 'potatge',
    'popote': 'canyeta', 'popotes': 'canyetes',
    'ponchera': 'bol', 'poncho': 'ponxo',
    'palito': 'palet', 'palitos': 'palets',
    'piedrita': 'pedreta', 'piedritas': 'pedretes',
    'piedrecita': 'pedreta', 'pedacito': 'trosset',
    'saquito': 'saquet', 'saquitos': 'saquets',
    'cucharita': 'cullereta', 'esterilla': 'estora', 'esterillas': 'estores',
    'ganchillo': 'ganxet', 'estraza': 'estrassa', 'rieles': 'rails',
    'taparrabos': 'tapall',
    'velillos': 'vels', 'papelillo': 'paperet', 'papelillos': 'paperets',
    'colita': 'cueta', 'ratito': 'estona', 'grupito': 'grupet',
    'brinquitos': 'saltirons', 'monerías': 'ganyotes',
    'morisquetas': 'ganyotes', 'acuclillados': 'ajupits',
    'semiocultos': 'semiocults', 'bocarriba': 'de cara amunt',
    'desparejada': 'desaparellada', 'deshilachadas': 'esfilagarsades',
    'apestosa': 'pudent', 'propuestos': 'proposats',
    'alcanzadas': 'assolides', 'resaltante': 'destacable',
    'pegaditos': 'ben junts', 'listillo': 'setciències',
    'canaletear': 'remar', 'zapatear': 'picar de peus',
    'zapatean': 'piquen de peus', 'chascar': 'fer petar',
    'chascando': 'fent petar', 'castañetazos': 'cops de dits',
    'castañeteando': 'fent petar els dits', 'alunizaje': 'allunatge',
    'campismo': 'acampada', 'cabuyería': 'nusos i cordes',
    'placajes': 'plaquejades', 'balonazos': 'pilotades',
    'huevazos': 'ouades', 'pitazo': 'xiulet', 'clarin': 'clarí',
    'exnovio': 'exparella', 'fulanito': 'en Tal', 'fulano': 'en Tal',
    'rededor': 'voltant', 'mita': 'meitat', 'seño': 'senyoreta',
    'chulito': 'gallet', 'cerebrito': 'cervellet',
    'psicoterror': 'assetjament psicològic', 'ligón': 'lligador',
    'caco': 'lladre', 'escondéos': 'amagueu-vos',
    'curriculum': 'currículum', 'prelimninares': 'preliminars',
    'destencionar': 'distendre', 'distensionar': 'distendre',
    'academicolaboral': 'academicolaboral', 'académicolaboral': 'academicolaboral',
    # mots que el PDF havia partit o enganxat
    'profesoradotutor': 'professorat tutor', 'grupoclase': 'grup classe',
    'crículo': 'cercle', 'oios': 'ulls', 'sietes': 'sets',
    'ultimo': 'últim', 'ultima': 'última', 'eses': 'esses',
    'grupalmete': 'en grup', 'contendor': 'contrincant',
    'preCUADRO': 'pre-CUADRO', 'alumCUADRO': 'alum-CUADRO',
}
_ordenats = sorted(GLOSSARI, key=len, reverse=True)
MOTS = re.compile(r'(?<![\wÀ-ÿ])(' + '|'.join(map(re.escape, _ordenats)) + r')(?![\wÀ-ÿ])')


def _mot(m):
    original = m.group(0)
    catala = GLOSSARI.get(original) or GLOSSARI[original.lower()]
    if original[0].isupper():
        return catala[0].upper() + catala[1:]
    return catala


# ---------------------------------------------------------------------------
# 2. Verbs que en catala porten complement directe sense preposicio. Els
#    originals castellans hi posen la «a» de persona i Apertium la manté.
# ---------------------------------------------------------------------------
VERBS_CD = [
    'agaf', 'atrap', 'empreson', 'colpej', 'assenyal', 'mir', 'escolt',
    'tri', 'cerc', 'busc', 'trob', 'elimin', 'sensibilitz', 'conscienci',
    'motiv', 'agrup', 'enumer', 'selection', 'seleccion', 'nomen', 'avalu',
    'observ', 'persegu', 'salud', 'felicit', 'acomiad', 'derroc', 'anim',
    'convid', 'ajud', 'toc', 'tap', 'abrac', 'convenc', 'orient', 'guid',
    'acompany', 'rellev', 'reemplac', 'substitu', 'castig', 'premi',
    'cohesion', 'distend', 'unir', 'ajunt', 'reun', 'cridar', 'crid',
]
SUFIX = r"(?:ar|ar-se|a|es|en|em|eu|ant|at|ats|ada|ades|arà|aran|aré|arem|i|is|in|ava|aven|à|aria|arien)"
DET = r"(?:l'|la\b|les\b|el\b|els\b|un\b|una\b|uns\b|unes\b|cada\b|algú\b|ningú\b|tots\b|totes\b|qualsevol\b|dos\b|dues\b|tres\b)"
_VERB = r'(?:' + '|'.join(VERBS_CD) + r')'

REGLES = [
    # --- «esta» sense accent a l'original: Apertium en fa un demostratiu ---
    (re.compile(r"(?<![\wÀ-ÿ])aquesta (?=(?:en |a |al |als |aquí|allà|dins|fora|davant|darrere|dempeus|amb |sota |sobre |de peu|assegut|dret|situat|col·locat|[\wÀ-ÿ]+nt(?![\wÀ-ÿ])))"), 'està '),
    (re.compile(r"(?<![\wÀ-ÿ])aquest (?=(?:en el centre|a la sala|al centre|aquí|allà|darrere|davant|dins|fora))"), 'està '),
    (re.compile(r"(?<![\wÀ-ÿ])aquestes (?=(?:aturat|assegut|dret|dempeus|a punt|fora|dins|preparat))"), 'estàs '),
    # --- lexic mal girat que depèn de la forma ---
    (re.compile(r"(?<![\wÀ-ÿ])circulo(?![\wÀ-ÿ])"), 'cercle'),
    (re.compile(r"(?<![\wÀ-ÿ])Circulo(?![\wÀ-ÿ])"), 'Cercle'),
    (re.compile(r"(?<![\wÀ-ÿ])igual numero de(?![\wÀ-ÿ])"), 'el mateix nombre de'),
    (re.compile(r"(?<![\wÀ-ÿ])(major|major nombre|el major) numero possible(?![\wÀ-ÿ])"), 'el nombre més gran possible'),
    (re.compile(r"(?<![\wÀ-ÿ])numero(?![\wÀ-ÿ])"), 'número'),
    (re.compile(r"(?<![\wÀ-ÿ])numeros(?![\wÀ-ÿ])"), 'números'),
    (re.compile(r"(?<![\wÀ-ÿ])ordenis(?![\wÀ-ÿ])"), 'ordres'),
    (re.compile(r"(?<![\wÀ-ÿ])agarr(a|ar|ats|ades|at|ada|en|em|eu|aran|arà)(?![\wÀ-ÿ])"),
     lambda m: 'agaf' + m.group(1)),
    (re.compile(r"(?<![\wÀ-ÿ])guiñarle l'ull(?![\wÀ-ÿ])"), "picar l'ullet"),
    (re.compile(r"(?<![\wÀ-ÿ])gui(ñ|ny)(a|ar|e|ant)(?![\wÀ-ÿ])"), "picar l'ullet"),
    # --- obligació: «deber» no és «deure» ---
    (re.compile(r"(?<![\wÀ-ÿ])deuen (?=[\wÀ-ÿ]+(?:ar|er|ir|re)(?![\wÀ-ÿ]))"), 'han de '),
    (re.compile(r"(?<![\wÀ-ÿ])deuen immediatament"), 'han de'),
    (re.compile(r"(?<![\wÀ-ÿ])deu (?=picar|guiñarle|fer|dir|anar|posar|tocar|sortir|córrer)"), 'ha de '),
    # --- «más» sense accent ---
    (re.compile(r"(?<![\wÀ-ÿ])(?<!un )(?<!Un )(?<!aquest )(?<!mateix )(?<!al )(?<!del )mes (?!o |del |d'aniversari)(?=[\wÀ-ÿ])"), 'més '),
    # --- complement directe amb «a» ---
    (re.compile(r"(?<![\wÀ-ÿ])(" + _VERB + SUFIX + r") a (?=" + DET + r")"),
     lambda m: m.group(1) + ' '),
    (re.compile(r"(?<![\wÀ-ÿ])(" + _VERB + SUFIX + r") als (?=[\wÀ-ÿ])"),
     lambda m: m.group(1) + ' els '),
    (re.compile(r"(?<![\wÀ-ÿ])(" + _VERB + SUFIX + r") al (?=[\wÀ-ÿ])"),
     lambda m: m.group(1) + ' el '),
    # --- «per a» davant d'infinitiu: en català la final és «per» ---
    (re.compile(r"(?<![\wÀ-ÿ])per a (?=(?:no |poder |saber |fer-|dur-|donar-|deixar-)?[\wÀ-ÿ·]+(?:ar|er|ir|re|ne|hi|ho|la|lo|les|los|se|hi)?(?:-[\wÀ-ÿ']+)*(?![\wÀ-ÿ]))"),
     None),  # es concreta a `per_a_infinitiu`
    # --- calcs d'expressió ---
    (re.compile(r"(?<![\wÀ-ÿ])fent el gangoso(?![\wÀ-ÿ])"), 'amb veu nassal'),
    (re.compile(r"(?<![\wÀ-ÿ])el gangoso(?![\wÀ-ÿ])"), 'la veu nassal'),
    (re.compile(r"(?<![\wÀ-ÿ])(don|donan|donar|dóna|donen|dona)(t|nt)? tornada(s|es)?(?![\wÀ-ÿ])"),
     lambda m: m.group(0).replace('tornades', 'voltes').replace('tornadas', 'voltes').replace('tornada', 'voltes')),
    (re.compile(r"(?<![\wÀ-ÿ])en el sòl(?![\wÀ-ÿ])"), 'a terra'),
    (re.compile(r"(?<![\wÀ-ÿ])al sòl(?![\wÀ-ÿ])"), 'a terra'),
    (re.compile(r"(?<![\wÀ-ÿ])que aquesta de peus(?![\wÀ-ÿ])"), 'que està dret'),
    (re.compile(r"(?<![\wÀ-ÿ])de peus(?![\wÀ-ÿ])"), 'dret'),
    (re.compile(r"(?<![\wÀ-ÿ])aquestes parat(?![\wÀ-ÿ])"), 'estàs aturat'),
    (re.compile(r"(?<![\wÀ-ÿ])([Gg])ana (?=(?:l'|el |la |els |les |qui |aquell|cada |un |una |dos |tres ))"),
     lambda m: m.group(1) + 'uanya '),
    (re.compile(r"(?<![\wÀ-ÿ])(jugador|equip|grup|parella|tren) gana(?![\wÀ-ÿ])"),
     lambda m: m.group(1) + ' guanya'),
    (re.compile(r"(?<![\wÀ-ÿ])Mocadors o mocadors de coll(?![\wÀ-ÿ])"), 'Mocadors'),
    (re.compile(r"(?<![\wÀ-ÿ])ulls cafès(?![\wÀ-ÿ])"), 'ulls marrons'),
    # --- «sentarse» no és «sentir-se» ---
    (re.compile(r"(?<![\wÀ-ÿ])(?:se|es) sentin (?=(?:en |a terra|al |a un extrem|silenciosament|i quan|formant))"), "s'asseuen "),
    (re.compile(r"(?<![\wÀ-ÿ])(?:se|es) senti (?=(?:en un |en el mateix lloc|en cadira|a un extrem|a terra|el mico|l'elefant))"), "s'asseu "),
    (re.compile(r"(?<![\wÀ-ÿ])tots (?:se|es) sentin(?![\wÀ-ÿ])"), "tots s'asseuen"),
    (re.compile(r"(?<![\wÀ-ÿ])(?:ha de |han de |intenta |intenten |tracta d')asseure(?![\w'-])"),
     lambda m: m.group(0)[:-len('asseure')] + ("asseure's" if m.group(0).startswith('tracta') else "asseure's")),
    (re.compile(r"(?<!s'ha )(?<!s'han )(?<!s'havien )(?<![\wÀ-ÿ])d'asseure(?![\w'-])"), "d'asseure's"),
    (re.compile(r"(?<![\wÀ-ÿ])presa assento(?![\wÀ-ÿ])"), 'seu'),
    (re.compile(r"(?<![\wÀ-ÿ])pren(en)? seient(?![\wÀ-ÿ])"), lambda m: 'seuen' if m.group(1) else 'seu'),
    # --- «tomados de las manos» ---
    (re.compile(r"(?<![\wÀ-ÿ])presos de (?:les mans|la mà)(?![\wÀ-ÿ])"), 'agafats de la mà'),
    (re.compile(r"(?<![\wÀ-ÿ])preses de (?:les mans|la mà)(?![\wÀ-ÿ])"), 'agafades de la mà'),
    (re.compile(r"(?<![\wÀ-ÿ])preses dels braços(?![\wÀ-ÿ])"), 'agafades pels braços'),
    (re.compile(r"(?<![\wÀ-ÿ])prendre de (?:les mans|la mà)(?![\wÀ-ÿ])"), "agafar-se de la mà"),
    (re.compile(r"(?<![\wÀ-ÿ])es prenen de la mà(?![\wÀ-ÿ])"), "s'agafen de la mà"),
    (re.compile(r"(?<![\wÀ-ÿ])agafar de les mans(?![\wÀ-ÿ])"), 'agafats de la mà'),
    (re.compile(r"(?<![\wÀ-ÿ])agafats de les mans(?![\wÀ-ÿ])"), 'agafats de la mà'),
    # --- comparatius calcats ---
    (re.compile(r"(?<![\wÀ-ÿ])el major nombre possible de(?![\wÀ-ÿ])"), 'el nombre més gran possible de'),
    (re.compile(r"(?<![\wÀ-ÿ])la major quantitat possible de(?![\wÀ-ÿ])"), 'la quantitat més gran possible de'),
    (re.compile(r"(?<![\wÀ-ÿ])la major quantitat de(?![\wÀ-ÿ])"), 'la quantitat més gran de'),
    (re.compile(r"(?<![\wÀ-ÿ])el major nombre de(?![\wÀ-ÿ])"), 'el nombre més gran de'),
    (re.compile(r"(?<![\wÀ-ÿ])el major número (?=de|dels)"), 'el nombre més gran '),
    (re.compile(r"(?<![\wÀ-ÿ])major semblança(?![\wÀ-ÿ])"), 'més semblances'),
    # --- «cada uno» com a pronom és «cadascú», no «cadascun» ---
    (re.compile(r"(?<![\wÀ-ÿ])[Cc]adascun(?! de| dels| de les| d'| dels)(?![\wÀ-ÿ])"),
     lambda m: m.group(0)[0] + 'adascú'),
    # --- desdoblaments de genere a la castellana ---
    (re.compile(r"/as(?![\wÀ-ÿ])"), '/es'),
    (re.compile(r"/os(?![\wÀ-ÿ])"), '/os'),
    # --- l'etiqueta del camp ja diu «Consignes de partida» ---
    (re.compile(r"^DE PARTIDA: *cap\.?$", re.M), 'Cap.'),
    (re.compile(r"(?<![\wÀ-ÿ])(?:CONSIGNA )?DE PARTIDA: *"), ''),
    # --- comparatius i ordre de «següent» ---
    (re.compile(r"(?<![\wÀ-ÿ])en relació a(?!mb)(?![\wÀ-ÿ])"), 'en relació amb'),
    (re.compile(r"(?<![\wÀ-ÿ])la següent (manera|forma)(?![\wÀ-ÿ])"), 'la manera següent'),
    (re.compile(r"(?<![\wÀ-ÿ])la següent vegada(?![\wÀ-ÿ])"), 'la vegada següent'),
    (re.compile(r"(?<![\wÀ-ÿ])(els|les) següents ([\wÀ-ÿ]+)(?=[:,.;\n])"),
     lambda m: f'{m.group(1)} {m.group(2)} següents'),
    (re.compile(r"(?<![\wÀ-ÿ])cada vegada major(?![\wÀ-ÿ])"), 'cada vegada més gran'),
    (re.compile(r"(?<![\wÀ-ÿ])(nombre|número|quantitat|puntuació) major(?![\wÀ-ÿ])"),
     lambda m: m.group(1) + ' més alt' if m.group(1) != 'quantitat' else 'quantitat més gran'),
    (re.compile(r"(?<![\wÀ-ÿ])major que(?![\wÀ-ÿ])"), 'més gran que'),
    (re.compile(r"(?<![\wÀ-ÿ])vívid(s?)(?![\wÀ-ÿ])"), lambda m: 'viscut' + m.group(1)),
    (re.compile(r"(?<![\wÀ-ÿ])[Vv]alonar(?![\wÀ-ÿ])"), 'Valorar'),
    (re.compile(r"(?<![\wÀ-ÿ])Grup, classe,\.{2,} *"), 'Grup o classe, '),
    (re.compile(r"(?<![\wÀ-ÿ])no - verbal(?![\wÀ-ÿ])"), 'no verbal'),
    (re.compile(r"(?<![\wÀ-ÿ])([Ll])a següent vegada(?![\wÀ-ÿ])"), lambda m: m.group(1) + 'a vegada següent'),
    # --- «pagar penitencia» en els jocs es «pagar penyora» ---
    (re.compile(r"(?<![\wÀ-ÿ])(pag(?:a|ar|uen|arà|aran|ui|uin)|rep(?:en|re)?) penitència(?![\wÀ-ÿ])"),
     lambda m: ('paguen' if m.group(1).startswith('rep') else m.group(1)) + ' penyora'),
    (re.compile(r"(?<![\wÀ-ÿ])penitència(?![\wÀ-ÿ])"), 'penyora'),
    # --- «igual numero de» / «el mateix numero de» ---
    (re.compile(r"(?<![\wÀ-ÿ])igual nombre de(?![\wÀ-ÿ])"), 'el mateix nombre de'),
    (re.compile(r"(?<![\wÀ-ÿ])número (?=de (?:participants|jugadors|persones|membres|integrants|alumnes))"), 'nombre '),
    (re.compile(r"(?<![\wÀ-ÿ])un número (?=parell|senar|imparell)"), 'un nombre '),
    (re.compile(r"(?<![\wÀ-ÿ])sentint-nos part d'ella(?![\wÀ-ÿ])"), "sentint-nos-en part"),
    (re.compile(r"(?<![\wÀ-ÿ])(sobre el|pel|en el) sòl(?![\wÀ-ÿ])"), 'a terra'),
    (re.compile(r"(?<![\wÀ-ÿ])[Ss]aló de classe(?![\wÀ-ÿ])"), 'aula'),
    (re.compile(r"(?<![\wÀ-ÿ])([Ss])alons(?![\wÀ-ÿ])"), lambda m: m.group(1) + 'ales'),
    (re.compile(r"(?<![\wÀ-ÿ])([Ss])aló(?![\wÀ-ÿ])"), lambda m: m.group(1) + 'ala'),
    # --- «derribar» no és «derrocar» ---
    (re.compile(r"(?<![\wÀ-ÿ])derrocar(?![\wÀ-ÿ])"), 'fer caure'),
    (re.compile(r"(?<![\wÀ-ÿ])derrocat(?![\wÀ-ÿ])"), 'tombat'),
    (re.compile(r"(?<![\wÀ-ÿ])derrocats(?![\wÀ-ÿ])"), 'tombats'),
    (re.compile(r"(?<![\wÀ-ÿ])derroca(?![\wÀ-ÿ])"), 'fa caure'),
    # --- apostrofacio que el glossari o l'original havien perdut ---
    (re.compile(r"(?<![\wÀ-ÿ])([Dd])e (?=[aeiouàèéíòóúAEIOU][\wÀ-ÿ'])(?!io|ia(?![\wÀ-ÿ])|uadi)"),
     lambda m: m.group(1) + "'"),
    (re.compile(r"(?<![\wÀ-ÿ])([Ee])l (?=[aeoàèéòóAEO][a-zà-ÿ'])"),
     lambda m: ("l" if m.group(1) == 'e' else "L") + "'"),
    (re.compile(r"(?<![\wÀ-ÿ])([Ee])l (?=[íóúÍÓÚ][a-zà-ÿ'])"),
     lambda m: ("l" if m.group(1) == 'e' else "L") + "'"),
    (re.compile(r"(?<![\wÀ-ÿ])([Ll])a (?=[aeoàèéòóíúAEO][a-zà-ÿ'])(?!amb(?![\wÀ-ÿ])|en(?![\wÀ-ÿ])|al(?![\wÀ-ÿ])|el(?![\wÀ-ÿ])|els(?![\wÀ-ÿ])|o(?![\wÀ-ÿ]))"),
     lambda m: m.group(1) + "'"),
    # --- ortotipografia ---
    (re.compile(r' +([,;:.!?%])'), r'\1'),
    (re.compile(r'([«¿¡(]) +'), r'\1'),
    (re.compile(r' +([»)])'), r'\1'),
    (re.compile(r'[ \t]{2,}'), ' '),
    (re.compile(r'\n{3,}'), '\n\n'),
    (re.compile(r'(?<![\wÀ-ÿ])(\d+) %'), r'\1%'),
]

# Infinitius: paraules que semblen infinitiu però no ho són mai en aquests
# textos, i que per tant no han de perdre la «a» del «per a».
NO_INFINITIU = {
    'paper', 'papers', 'carrer', 'carrers', 'taller', 'tallers', 'poder',
    'poders', 'dinar', 'sopar', 'esmorzar', 'berenar', 'gener', 'febrer',
    'somriure', 'aire', 'pare', 'mare', 'sabre', 'lliure', 'llibre',
    'nombre', 'membre', 'ordre', 'pobre', 'sobre', 'cambrer', 'company',
    'dijous', 'obrir', 'cadira', 'pissarra', 'mestre', 'centre', 'ventre',
    'entre', 'quatre', 'cotxe', 'home', 'dolor', 'valor', 'color', 'favor',
    'major', 'menor', 'millor', 'pitjor', 'primer', 'darrer', 'enter',
    'sencer', 'sincer', 'lleuger', 'amor', 'error', 'terra', 'guerra',
}
INFINITIU = re.compile(
    r"(?<![\wÀ-ÿ])per a (?=([\wÀ-ÿ·]+?(?:ar|er|ir|re|ur))(?:['’-][\wÀ-ÿ']+)*(?![\wÀ-ÿ]))")


def per_a_infinitiu(text):
    """«per a fer» -> «per fer», deixant «per a» davant de nom o pronom."""
    def canvi(m):
        mot = m.group(1).lower()
        if mot in NO_INFINITIU:
            return m.group(0)
        return 'per '
    return INFINITIU.sub(canvi, text)


# Els PDF originals parteixen les frases enmig; si la linia no acaba en signe
# de puntuacio i la seguent comenca en minuscula, es la mateixa frase.
TALL = re.compile(r"(?<=[\wÀ-ÿ,])\n{1,2}(?=[a-zà-ÿ])")


def ajunta_linies(text):
    return TALL.sub(' ', text)


# ---------------------------------------------------------------------------
# 3. Titols. Els originals venen amb Majuscula A Cada Mot, que es un us
#    angles: en catala nomes van en majuscula la primera paraula i els noms
#    propis.
# ---------------------------------------------------------------------------
NOMS_PROPIS = {
    'Kabita', 'Sagidi', 'Sapopo', 'Pukutu', 'Buchi', 'Bucha', 'Dalila',
    'Chagualo', 'Chágualo', 'Scouter', 'Scouters', 'Theis', 'Palen', 'Silux',
    'Dracula', 'Dràcula', 'Kim', 'Noe', 'Noè', 'Meche', 'Pablo', 'Holmes',
    'Sant', 'Joan', 'Cruz', 'Pio', 'Pío', 'Chicho', 'Delhi', 'Maria',
    'María', 'Simon', 'Simón', 'Sanson', 'Sansó', 'Pinotxo', 'Jokin',
    'Nasa', 'NASA', 'Espanya', 'Europa', 'Índia', 'Nadal', 'Gavilan',
    'Chiguagua', 'Chinichino', 'Chiníchinó', 'Marroc', 'Bingo',
}
ROMANS = re.compile(r'^[IVXLCDM]+$')


def titol_en_frase(titol):
    """«Abraçades Musicals Cooperatives» -> «Abraçades musicals cooperatives»."""
    mots = titol.split(' ')
    sortida = []
    for i, mot in enumerate(mots):
        nu = mot.strip("¿?¡!()«»\"'.,:;")
        propi = not nu or nu in NOMS_PROPIS or nu.isupper()             or ROMANS.match(nu) or any(c.isdigit() for c in nu)
        if i and not propi:
            mot = mot[0].lower() + mot[1:] if mot[0].isupper() else mot
        # «L'Amic» -> «L'amic», tambe si es la primera paraula
        rere = re.sub(r"^(l|d|n|s|L|D)(['’])(.*)$", lambda m: m.group(3), mot)
        if rere and rere != mot and rere.strip("¿?¡!()«»\"'.,:;") not in NOMS_PROPIS:
            mot = re.sub(r"^(l|d|n|s|L|D)(['’])([A-ZÀ-Ý])",
                         lambda m: m.group(1) + m.group(2) + m.group(3).lower(), mot)
        sortida.append(mot)
    return ' '.join(sortida)


def esmena(text):
    if not text:
        return text
    nou = ajunta_linies(text)
    nou = MOTS.sub(_mot, nou)
    for patro, canvi in REGLES:
        if canvi is None:
            nou = per_a_infinitiu(nou)
        else:
            nou = patro.sub(canvi, nou)
    return nou


def main(argv):
    prova = '--prova' in argv
    noms = [a for a in argv if not a.startswith('--')]
    fitxers = sorted(f for f in os.listdir(DESTI) if f.endswith('.json'))
    if noms:
        volguts = {n if n.endswith('.json') else n + '.json' for n in noms}
        fitxers = [f for f in fitxers if f in volguts]

    total_camps = total_fitxes = 0
    for fitxer in fitxers:
        cami = os.path.join(DESTI, fitxer)
        with open(cami, encoding='utf-8') as fh:
            dades = json.load(fh)
        canvis = 0
        fitxes = 0
        for _id, entrada in dades.items():
            tocada = False
            for camp in CAMPS:
                if camp not in entrada:
                    continue
                nou = esmena(entrada[camp])
                if camp == 'titol':
                    nou = titol_en_frase(nou)
                if nou != entrada[camp]:
                    entrada[camp] = nou
                    canvis += 1
                    tocada = True
            if tocada:
                fitxes += 1
        if canvis and not prova:
            with open(cami, 'w', encoding='utf-8') as fh:
                json.dump(dades, fh, ensure_ascii=False, indent=2, sort_keys=True)
                fh.write('\n')
        if canvis:
            print(f'{fitxer}: {canvis} camps esmenats en {fitxes} fitxes')
        total_camps += canvis
        total_fitxes += fitxes
    print(f'\nTotal: {total_camps} camps esmenats en {total_fitxes} fitxes'
          + (' (prova, no s\'ha desat res)' if prova else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
