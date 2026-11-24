#!/usr/bin/env python3
"""Costruisce dati/elementi.json unendo le fonti ufficiali e le schede in italiano.

Fonti (tutte copiate in dati/ con la loro provenienza):
  - PubChem, Periodic Table of Elements (pubblico dominio): dati/fonti/PubChemElements_all.csv
  - NIST Atomic Spectra Database, configurazioni ed energie di ionizzazione (via PDG 2024, tab. 5.1):
    dati/nist_configurazioni.js (Z 1-103)
  - IUPAC CIAAW, composizioni isotopiche ed elementi radioattivi (NUBASE2020): dati/isotopi.py
  - Schede in italiano (storia, usi, curiosita'): dati/testi_1..4.py; descrizioni: dati/descrizioni.py

Uso: python3 strumenti/costruisci_dati.py   (stampa anche il controllo incrociato tra le fonti)
"""
import csv, json, os, re, sys

QUI = os.path.dirname(os.path.abspath(__file__))
DATI = os.path.join(QUI, '..', 'dati')
sys.path.insert(0, DATI)
from isotopi import ISOTOPI  # noqa: E402
from descrizioni import D as DESCR  # noqa: E402

T = {}
for i in range(1, 5):
    mod = __import__('testi_%d' % i)
    T.update(mod.T)

# ---------- PubChem ----------
pub = {int(r['AtomicNumber']): r for r in csv.DictReader(open(os.path.join(DATI, 'fonti', 'PubChemElements_all.csv'), encoding='utf-8'))}

# ---------- NIST ----------
src = open(os.path.join(DATI, 'nist_configurazioni.js'), encoding='utf-8').read()
nist = {}
for m in re.finditer(r'\[(\d+),"(\w+)","([^"]+)",([\d.]+)\]', src):
    nist[int(m.group(1))] = (m.group(2), m.group(3), float(m.group(4)))

NOBILI = {'He': '1s2', 'Ne': '[He] 2s2 2p6', 'Ar': '[Ne] 3s2 3p6', 'Kr': '[Ar] 3d10 4s2 4p6',
          'Xe': '[Kr] 4d10 5s2 5p6', 'Rn': '[Xe] 4f14 5d10 6s2 6p6', 'Hg': '[Xe] 4f14 5d10 6s2'}
L = 'spdf'
ORDINE = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p']


def sottolivelli(conf):
    """'(Kr) 4d10 5s2 5p3' o '[Rn]7s2 5f14 6d2' -> lista [(sottolivello, elettroni)] esplicita."""
    conf = conf.replace('(predicted)', '').replace('(calculated)', '').strip()
    conf = re.sub(r'[\(\[](\w+)[\)\]]', lambda m: ' [' + m.group(1) + '] ', conf)
    out = []
    for tok in conf.split():
        if tok.startswith('['):
            out += sottolivelli(NOBILI[tok[1:-1]])
            continue
        m = re.fullmatch(r'(\d)([spdf])(\d*)', tok)
        if not m:
            raise ValueError('token sconosciuto %r in %r' % (tok, conf))
        out.append((m.group(1) + m.group(2), int(m.group(3) or 1)))
    return out


SUP = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')


def forma(conf_nucleo, lista):
    """Scrittura per la scheda: nucleo di gas nobile + sottolivelli esterni con apici."""
    return (('[' + conf_nucleo + '] ') if conf_nucleo else '') + ' '.join(s + str(n).translate(SUP) for s, n in lista)


def scrittura_compatta(lista):
    """Sceglie il gas nobile piu' grande contenuto e scrive il resto in ordine di energia."""
    tot = dict(lista)
    best, resto = None, lista
    for g in ['Rn', 'Xe', 'Kr', 'Ar', 'Ne', 'He']:
        core = dict(sottolivelli(NOBILI[g]))
        if all(tot.get(k, 0) >= v for k, v in core.items()) and sum(tot.values()) > sum(core.values()):
            best = g
            resto = [(k, tot[k] - core.get(k, 0)) for k in tot if tot[k] - core.get(k, 0) > 0]
            break
    resto.sort(key=lambda kv: (int(kv[0][0]), L.index(kv[0][1])))
    return forma(best, resto)


def posizione(z):
    """(periodo, gruppo o None, riga e colonna nella griglia, blocco)."""
    lim = [2, 10, 18, 36, 54, 86, 118]
    p = next(i + 1 for i, x in enumerate(lim) if z <= x)
    if 57 <= z <= 71 or 89 <= z <= 103:
        return p, None, (9 if p == 6 else 10), 3 + (z - (57 if p == 6 else 89)), 'f'
    if p == 1:
        g = 1 if z == 1 else 18
    elif p in (2, 3):
        start = 3 if p == 2 else 11
        k = z - start
        g = k + 1 if k < 2 else k + 11
    elif p in (4, 5):
        g = z - (18 if p == 4 else 36)
    else:
        g = z - (54 if p == 6 else 86)
        if g > 2:
            g = z - (68 if p == 6 else 100)
    b = 's' if g in (1, 2) or z == 2 else ('p' if g >= 13 else 'd')
    return p, g, p, g, b


CAT = {'Nonmetal': 'Non metallo', 'Noble gas': 'Gas nobile', 'Alkali metal': 'Metallo alcalino',
       'Alkaline earth metal': 'Metallo alcalino-terroso', 'Metalloid': 'Semimetallo', 'Halogen': 'Alogeno',
       'Post-transition metal': 'Metallo post-transizionale', 'Transition metal': 'Metallo di transizione',
       'Lanthanide': 'Lantanide', 'Actinide': 'Attinide'}
STATO = {'Gas': 'Gas', 'Solid': 'Solido', 'Liquid': 'Liquido',
         'Expected to be a Solid': 'Previsto solido', 'Expected to be a Gas': 'Previsto gas'}


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


avvisi = []
elementi = []
for z in range(1, 119):
    r = pub[z]
    nome, anno, chi, storia, usi, cur = T[z]
    A, abb, emiv = ISOTOPI[z]
    if z in nist:
        sym, conf_raw, ie = nist[z]
        if sym != r['Symbol']:
            avvisi.append('Z=%d simbolo NIST %s diverso da PubChem %s' % (z, sym, r['Symbol']))
        sub = sottolivelli(conf_raw)
        conf_fonte = 'NIST'
        pie = num(r['IonizationEnergy'])
        if pie is not None and abs(pie - ie) > 0.02:
            avvisi.append('Z=%d energia di ionizzazione NIST %.4f, PubChem %.3f' % (z, ie, pie))
        psub = dict(sottolivelli(r['ElectronConfiguration']))
        if psub != dict(sub):
            avvisi.append('Z=%d configurazione NIST %s, PubChem %s' % (z, conf_raw, r['ElectronConfiguration']))
    else:
        sub = sottolivelli(r['ElectronConfiguration'])
        ie = num(r['IonizationEnergy'])
        conf_fonte = 'PubChem (calcolata)'
    if sum(n for _, n in sub) != z:
        avvisi.append('Z=%d la configurazione non somma a Z' % z)
    gusci = [0] * 7
    for s, n in sub:
        gusci[int(s[0]) - 1] += n
    while gusci and gusci[-1] == 0:
        gusci.pop()
    p, g, row, col, blocco = posizione(z)
    massa = r['AtomicMass']
    stabile = abb is not None
    if not stabile and abs(round(float(massa)) - A) > 0:
        avvisi.append('Z=%d massa PubChem %s non corrisponde all\'isotopo scelto %d' % (z, massa, A))
    py = r['YearDiscovered']
    if py.isdigit() and anno.isdigit() and abs(int(py) - int(anno)) > 0:
        avvisi.append('Z=%d anno scheda %s, PubChem %s' % (z, anno, py))
    if (py == 'Ancient') != (anno == 'Antichità'):
        avvisi.append('Z=%d anno scheda %s, PubChem %s' % (z, anno, py))
    elementi.append({
        'z': z, 's': r['Symbol'], 'n': nome, 'en': r['Name'],
        'm': massa, 'stab': stabile,
        'cat': CAT[r['GroupBlock']], 'st': STATO[r['StandardState']],
        'conf': scrittura_compatta(sub), 'cf': conf_fonte,
        'sub': [[s, n] for s, n in sorted(sub, key=lambda kv: ORDINE.index(kv[0]))],
        'gusci': gusci, 'A': A, 'N': A - z, 'ab': abb, 't': emiv,
        'eneg': num(r['Electronegativity']), 'r': num(r['AtomicRadius']), 'ie': ie,
        'ea': num(r['ElectronAffinity']), 'ox': r['OxidationStates'].replace('-', '−').strip(),
        'mp': num(r['MeltingPoint']), 'bp': num(r['BoilingPoint']), 'd': num(r['Density']),
        'p': p, 'g': g, 'b': blocco, 'row': row, 'col': col,
        'descr': DESCR[z], 'anno': anno, 'chi': chi, 'storia': storia, 'usi': usi, 'cur': cur, 'cpk': r['CPKHexColor'],
    })

json.dump(elementi, open(os.path.join(DATI, 'elementi.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('elementi.json: %d elementi' % len(elementi))
print('Controllo incrociato tra le fonti (%d note):' % len(avvisi))
for a in avvisi:
    print('  ' + a)
