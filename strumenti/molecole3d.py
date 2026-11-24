#!/usr/bin/env python3
"""Dalla formula di struttura (SMILES) a un modello 3D della molecola.

Metodo, in breve:
  1. lettura dello SMILES (atomi, legami, anelli, cariche, aromaticita', chiralita' @/@@, doppi legami / \\);
  2. aggiunta degli idrogeni impliciti;
  3. geometria ideale: lunghezze di legame tipiche per coppia di elementi e ordine di legame,
     angoli dalla teoria VSEPR (domini elettronici = legami + coppie solitarie);
  4. minimizzazione di un campo di forze semplice (legami, angoli, planarita' dei sistemi coniugati,
     torsioni sfalsate, repulsione tra atomi lontani, segno della chiralita') con L-BFGS, da piu' partenze.

La precisione e' verificata con strumenti/verifica3d.py sulle strutture 3D pubblicate del database
FreeSolv (Mobley e Guthrie 2014, CC BY 4.0).
"""
import math, re
import numpy as np
from scipy.optimize import minimize

ORG = {'B': 3, 'C': 4, 'N': 3, 'O': 2, 'P': 3, 'S': 2, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1}
VAL_EXTRA = {'N': [3, 5], 'P': [3, 5], 'S': [2, 4, 6]}
ELETTRONI_VAL = {'H': 1, 'B': 3, 'C': 4, 'N': 5, 'O': 6, 'F': 7, 'Si': 4, 'P': 5, 'S': 6, 'Cl': 7, 'Br': 7, 'I': 7,
                 'Se': 6, 'As': 5, 'Ge': 4, 'Xe': 8, 'Kr': 8, 'Te': 6, 'Al': 3, 'Be': 2, 'Sn': 4, 'Sb': 5}
# raggi covalenti per legame semplice, doppio, triplo (Pyykko' e Atsumi), in angstrom
R1 = {'H': .32, 'Li': 1.33, 'Be': 1.02, 'B': .85, 'C': .75, 'N': .71, 'O': .63, 'F': .64, 'Na': 1.55, 'Mg': 1.39,
      'Al': 1.26, 'Si': 1.16, 'P': 1.11, 'S': 1.03, 'Cl': .99, 'K': 1.96, 'Ca': 1.71, 'Ti': 1.36, 'Cr': 1.22,
      'Mn': 1.19, 'Fe': 1.16, 'Co': 1.11, 'Ni': 1.10, 'Cu': 1.12, 'Zn': 1.18, 'Ge': 1.21, 'As': 1.21, 'Se': 1.16,
      'Br': 1.14, 'Kr': 1.17, 'Sn': 1.40, 'Sb': 1.40, 'Te': 1.36, 'I': 1.33, 'Xe': 1.31, 'Pt': 1.23, 'Hg': 1.33, 'Pb': 1.44}
R2 = {'B': .78, 'C': .67, 'N': .60, 'O': .57, 'Si': 1.07, 'P': 1.02, 'S': .94, 'Se': 1.07, 'As': 1.14, 'Cl': .95}
R3 = {'B': .73, 'C': .60, 'N': .54, 'O': .53, 'P': .94, 'S': .95}
# lunghezze tipiche misurate per i legami piu' comuni (angstrom)
TIPICHE = {('C', 'C', 1): 1.53, ('C', 'C', 2): 1.34, ('C', 'C', 3): 1.20, ('C', 'C', 1.5): 1.39,
           ('C', 'H', 1): 1.09, ('C', 'N', 1): 1.47, ('C', 'N', 2): 1.28, ('C', 'N', 3): 1.16, ('C', 'N', 1.5): 1.34,
           ('C', 'O', 1): 1.43, ('C', 'O', 2): 1.21, ('C', 'O', 1.5): 1.36, ('C', 'O', 3): 1.13,
           ('H', 'N', 1): 1.01, ('H', 'O', 1): 0.96, ('H', 'S', 1): 1.34, ('C', 'S', 1): 1.82, ('C', 'S', 2): 1.61,
           ('C', 'S', 1.5): 1.71, ('C', 'F', 1): 1.35, ('C', 'Cl', 1): 1.77, ('C', 'Br', 1): 1.94, ('C', 'I', 1): 2.14,
           ('N', 'N', 1): 1.45, ('N', 'N', 2): 1.25, ('N', 'N', 3): 1.10, ('N', 'N', 1.5): 1.35, ('N', 'O', 1): 1.40,
           ('N', 'O', 2): 1.21, ('O', 'O', 1): 1.48, ('O', 'O', 2): 1.21, ('O', 'P', 1): 1.60, ('O', 'P', 2): 1.48,
           ('O', 'S', 1): 1.58, ('O', 'S', 2): 1.43, ('H', 'H', 1): 0.74, ('Cl', 'Cl', 1): 1.99, ('F', 'F', 1): 1.42,
           ('H', 'Cl', 1): 1.27, ('H', 'F', 1): 0.92, ('O', 'Si', 1): 1.63, ('H', 'Si', 1): 1.48, ('H', 'P', 1): 1.42,
           ('C', 'P', 1): 1.84, ('C', 'Si', 1): 1.87, ('S', 'S', 1): 2.05, ('Br', 'Br', 1): 2.28, ('I', 'I', 1): 2.67,
           ('H', 'B', 1): 1.19, ('B', 'O', 1): 1.37, ('B', 'F', 1): 1.31, ('F', 'S', 1): 1.56, ('Cl', 'P', 1): 2.04,
           ('F', 'Xe', 1): 1.95, ('C', 'H', 1.5): 1.09}
VDW = {'H': 1.10, 'C': 1.70, 'N': 1.55, 'O': 1.52, 'F': 1.47, 'P': 1.80, 'S': 1.80, 'Cl': 1.75, 'Br': 1.85, 'I': 1.98}


class Mol:
    def __init__(self):
        self.el, self.carica, self.arom, self.hesp, self.chir, self.ordine_vicini = [], [], [], [], [], []
        self.legami = []          # (i, j, ordine)
        self.stereo = {}          # (i, j) -> '/' o '\\' sul legame semplice i-j, nel verso di lettura


TOK = re.compile(r'(\[[^\]]+\]|Br|Cl|[BCNOPSFI]|[bcnops]|[=#:/\\\-]|\(|\)|%\d\d|\d|\.)')


def leggi_smiles(s):
    m = Mol()
    prec, pila, anelli = None, [], {}
    ordine_legame, stereo = None, None
    for tok in TOK.findall(s):
        if tok == '(':
            pila.append(prec); continue
        if tok == ')':
            prec = pila.pop(); continue
        if tok == '.':
            prec = None; continue
        if tok in ('=', '#', ':', '-'):
            ordine_legame = {'=': 2, '#': 3, ':': 1.5, '-': 1}[tok]; continue
        if tok in ('/', '\\'):
            stereo = tok; continue
        if tok[0] == '%' or tok.isdigit():
            n = int(tok.lstrip('%'))
            if n in anelli:
                j, o_ap, st_ap, pos = anelli.pop(n)
                o = ordine_legame or o_ap or (1.5 if m.arom[prec] and m.arom[j] else 1)
                m.legami.append((j, prec, o))
                m.ordine_vicini[j][pos] = prec
                m.ordine_vicini[prec].append(j)
            else:
                m.ordine_vicini[prec].append(None)
                anelli[n] = (prec, ordine_legame, stereo, len(m.ordine_vicini[prec]) - 1)
            ordine_legame, stereo = None, None
            continue
        # atomo
        i = len(m.el)
        if tok.startswith('['):
            mm = re.fullmatch(r'\[(\d*)([A-Z][a-z]?|[bcnops]|se|as)(@@|@)?(H\d?)?([+-]+\d*|[+-]\d+)?\]', tok)
            if not mm:
                raise ValueError('atomo non riconosciuto ' + tok)
            simb = mm.group(2)
            arom = simb[0].islower()
            simb = simb.capitalize()
            chir = mm.group(3)
            h = mm.group(4)
            hcount = 0 if not h else (1 if h == 'H' else int(h[1:]))
            q = mm.group(5) or ''
            if q:
                if re.fullmatch(r'[+-]\d+', q):
                    carica = int(q)
                else:
                    carica = q.count('+') - q.count('-')
            else:
                carica = 0
            m.el.append(simb); m.arom.append(arom); m.carica.append(carica); m.hesp.append(hcount); m.chir.append(chir)
        else:
            arom = tok[0].islower()
            m.el.append(tok.capitalize() if len(tok) == 1 else tok); m.arom.append(arom); m.carica.append(0)
            m.hesp.append(None); m.chir.append(None)
        m.ordine_vicini.append([])
        if prec is not None:
            o = ordine_legame or (1.5 if m.arom[prec] and m.arom[i] else 1)
            m.legami.append((prec, i, o))
            if stereo:
                m.stereo[(prec, i)] = stereo
            m.ordine_vicini[i].append(prec)
            m.ordine_vicini[prec].append(i)
        if m.hesp[i]:
            m.ordine_vicini[i].append('H')
        prec = i
        ordine_legame, stereo = None, None
    if anelli:
        raise ValueError('anello non chiuso in ' + s)
    return m


def aggiungi_idrogeni(m):
    n = len(m.el)
    somma = [0.0] * n
    narom = [0] * n
    for i, j, o in m.legami:
        for a in (i, j):
            somma[a] += 1 if o == 1.5 else o
            narom[a] += o == 1.5
    for a in range(n):
        if m.hesp[a] is None:
            e = m.el[a]
            if e not in ORG:
                h = 0
            else:
                h = 0
                for v in VAL_EXTRA.get(e, [ORG[e]]):
                    if v >= somma[a]:
                        h = v - somma[a]
                        break
                if m.arom[a]:
                    h = max(0, ORG[e] - somma[a] - 1) if e in ('C', 'N', 'B') else 0
            m.hesp[a] = int(round(h))
    for a in range(n):
        for k in range(m.hesp[a]):
            hi = len(m.el)
            m.el.append('H'); m.arom.append(False); m.carica.append(0); m.hesp.append(0); m.chir.append(None)
            m.ordine_vicini.append([a])
            m.legami.append((a, hi, 1))
            if 'H' in m.ordine_vicini[a]:
                m.ordine_vicini[a][m.ordine_vicini[a].index('H')] = hi
            else:
                m.ordine_vicini[a].append(hi)
    return m


def anelli_piccoli(n, legami, massimo=6):
    vic = [[] for _ in range(n)]
    for i, j, o in legami:
        vic[i].append(j); vic[j].append(i)
    trovati = set()
    def dfs(start, cur, cammino):
        for v in vic[cur]:
            if v == start and len(cammino) >= 3:
                trovati.add(tuple(sorted(cammino)) + (len(cammino),) if False else frozenset(cammino))
            elif v not in cammino and v > start and len(cammino) < massimo:
                dfs(start, v, cammino + [v])
    for a in range(n):
        dfs(a, a, [a])
    return [set(r) for r in trovati]


def aromatizza(m):
    """Anelli di 5 o 6 atomi tutti coniugati (doppi legami alterni, oppure N, O, S con coppia libera) -> legami 1,5.
    Si ripete finche' cambia qualcosa, perche' negli anelli fusi un anello aromatico rende aromatico il vicino."""
    n = len(m.el)
    anelli = [r for r in anelli_piccoli(n, m.legami) if len(r) in (5, 6)]
    cambiato = True
    while cambiato:
        cambiato = False
        ordini, vic = {}, [[] for _ in range(n)]
        for i, j, o in m.legami:
            ordini[(i, j)] = ordini[(j, i)] = o
            vic[i].append(j); vic[j].append(i)
        def coniugato(a):
            if any(ordini[(a, b)] in (2, 1.5) for b in vic[a]):
                return True
            return m.el[a] in ('N', 'O', 'S') and m.carica[a] == 0 and len(vic[a]) <= 3
        for r in anelli:
            if all(m.arom[a] for a in r) and all(ordini[(i, j)] == 1.5 for i in r for j in vic[i] if j in r):
                continue
            if not all(coniugato(a) for a in r):
                continue
            if len(r) == 6 and any(m.el[a] not in ('C', 'N') for a in r):
                continue
            doppi = sum(1 for (i, j), o in ordini.items() if i < j and i in r and j in r and o in (2, 1.5))
            if doppi < (3 if len(r) == 6 else 2):
                continue
            for k, (i, j, o) in enumerate(m.legami):
                if i in r and j in r and o in (1, 2):
                    m.legami[k] = (i, j, 1.5); cambiato = True
            for a in r:
                m.arom[a] = True
            if cambiato:
                break
    return m


def lunghezza(a, b, o):
    k = tuple(sorted((a, b))) + (o,)
    if k in TIPICHE:
        return TIPICHE[k]
    if o == 1.5:
        return 0.5 * (lunghezza(a, b, 1) + lunghezza(a, b, 2))
    R = {1: R1, 2: R2, 3: R3}[int(o)]
    return R.get(a, R1.get(a, 1.2)) + R.get(b, R1.get(b, 1.2))


def geometria(m, partenze=6, seme=1):
    n = len(m.el)
    vic = [[] for _ in range(n)]
    ordini = {}
    for i, j, o in m.legami:
        vic[i].append(j); vic[j].append(i)
        ordini[(i, j)] = ordini[(j, i)] = o
    somma_o = [sum(ordini[(a, b)] for b in vic[a]) for a in range(n)]
    multiplo = [any(ordini[(a, b)] in (2, 3, 1.5) for b in vic[a]) for a in range(n)]
    tripli = [sum(ordini[(a, b)] == 3 for b in vic[a]) + (sum(ordini[(a, b)] == 2 for b in vic[a]) >= 2) for a in range(n)]
    # coppie solitarie (gruppi principali)
    lp = [0] * n
    for a in range(n):
        e = m.el[a]
        if e in ELETTRONI_VAL:
            liberi = ELETTRONI_VAL[e] - m.carica[a] - somma_o[a]
            lp[a] = max(0, int(liberi // 2))
    planare = [False] * n
    for a in range(n):
        if multiplo[a]:
            planare[a] = True
    for a in range(n):  # N e O coniugati (ammidi, aniline, pirroli): la coppia solitaria e' nel sistema pi
        if m.el[a] == 'N' and not multiplo[a] and len(vic[a]) == 3 and lp[a] == 1 and any(planare[b] and m.el[b] != 'H' for b in vic[a]):
            lp[a] = 0; planare[a] = True
        if m.arom[a] and m.el[a] in ('O', 'S') and lp[a] == 2:
            lp[a] = 1
    termini_d, termini_rep = [], []   # (i, j, d0, k)
    # gruppi in risonanza (carbonato, carbossilato, nitrato, solfato, fosfato): legami X-O terminali tutti uguali
    def risonante(c):
        term = [b for b in vic[c] if m.el[b] == 'O' and len(vic[b]) == 1]
        return len(term) >= 2 and any(ordini[(c, b)] == 2 for b in term) and any(m.carica[b] < 0 for b in term)
    ris = [risonante(a) for a in range(n)]
    for i, j, o in m.legami:
        d0 = lunghezza(m.el[i], m.el[j], o)
        for c, t in ((i, j), (j, i)):
            if ris[c] and m.el[t] == 'O' and len(vic[t]) == 1:
                d0 = 0.5 * (lunghezza(m.el[c], 'O', 1) + lunghezza(m.el[c], 'O', 2))
        termini_d.append((i, j, d0, 300.0))
    piccoli = anelli_piccoli(n, m.legami, 4)
    anelli3 = [r for r in piccoli if len(r) == 3]
    anelli4 = [r for r in piccoli if len(r) == 4]
    centri_grandi = []
    for a in range(n):
        k = len(vic[a])
        sn = k + lp[a]
        if k < 2:
            continue
        if sn >= 5:
            centri_grandi.append(a)
            continue
        if tripli[a] and sn == 2:
            ang = 180.0
        elif sn == 2:
            ang = 180.0
        elif sn == 3:
            ang = 120.0 if lp[a] == 0 else 117.0
        else:
            ang = {0: 109.47, 1: 107.0, 2: 104.5}.get(lp[a], 104.5)
        for x in range(k):
            for y in range(x + 1, k):
                b, c = vic[a][x], vic[a][y]
                ang_bc = ang
                if any({a, b, c} <= r for r in anelli3):
                    ang_bc = 60.0
                elif any({a, b, c} <= r for r in anelli4):
                    ang_bc = 90.0
                d1 = lunghezza(m.el[a], m.el[b], ordini[(a, b)]); d2 = lunghezza(m.el[a], m.el[c], ordini[(a, c)])
                d13 = math.sqrt(d1 * d1 + d2 * d2 - 2 * d1 * d2 * math.cos(math.radians(ang_bc)))
                termini_d.append((b, c, d13, 80.0))
    # coppie solitarie come punti fittizi per i centri con 5 o 6 domini (SF6, XeF4, PCl5...)
    fittizi = []
    for a in centri_grandi:
        for _ in range(lp[a]):
            fittizi.append(a)
    nt = n + len(fittizi)
    for idx, a in enumerate(fittizi):
        # la coppia solitaria sta alla stessa distanza dei legami: cosi' la repulsione dipende solo dagli angoli
        r_media = np.mean([lunghezza(m.el[a], m.el[b], ordini[(a, b)]) for b in vic[a]])
        termini_d.append((a, n + idx, r_media, 300.0))
    repulsioni_vsepr = []   # (i, j, peso) energia peso/r
    for a in centri_grandi:
        dom = [(b, 1.0) for b in vic[a]] + [(n + idx, 1.6) for idx, c in enumerate(fittizi) if c == a]
        for x in range(len(dom)):
            for y in range(x + 1, len(dom)):
                repulsioni_vsepr.append((dom[x][0], dom[y][0], dom[x][1] * dom[y][1] * 40.0))
    # torsioni
    torsioni = []   # (i, j, k, l, periodicita', fase, forza)
    for i, j, o in m.legami:
        if len(vic[i]) < 2 or len(vic[j]) < 2:
            continue
        coniugato = o in (2, 1.5) or (o == 1 and planare[i] and planare[j])
        for a in vic[i]:
            if a == j:
                continue
            for d in vic[j]:
                if d == i or d == a:
                    continue
                if coniugato:
                    torsioni.append((a, i, j, d, 2, 0.0, 6.0 if o != 1 else 2.5))
                elif not planare[i] and not planare[j] and o == 1 and len(vic[i]) >= 3 and len(vic[j]) >= 3:
                    torsioni.append((a, i, j, d, 3, 0.0, 0.6))
    # doppi legami con / \ : cis o trans tra i sostituenti indicati
    for (i, j, o) in m.legami:
        if o != 2:
            continue
        sa = [(x, s) for (x, y), s in m.stereo.items() if y == i] + [(y, {'/': '\\', '\\': '/'}[s]) for (x, y), s in m.stereo.items() if x == i]
        sd = [(y, s) for (x, y), s in m.stereo.items() if x == j] + [(x, {'/': '\\', '\\': '/'}[s]) for (x, y), s in m.stereo.items() if y == j]
        if sa and sd:
            a, s1 = sa[0]; d, s2 = sd[0]
            trans = s1 == s2
            torsioni.append((a, i, j, d, 1, math.pi if trans else 0.0, 12.0))
    # repulsione tra atomi a 3 o piu' legami di distanza
    dist_top = np.full((n, n), 99, dtype=int)
    for s in range(n):
        dist_top[s, s] = 0
        fr = [s]
        while fr:
            nf = []
            for u in fr:
                for v in vic[u]:
                    if dist_top[s, v] == 99:
                        dist_top[s, v] = dist_top[s, u] + 1; nf.append(v)
            fr = nf
    coppie_nb = [(i, j, (0.62 if dist_top[i, j] == 3 else 0.78) * (VDW.get(m.el[i], 1.8) + VDW.get(m.el[j], 1.8)))
                 for i in range(n) for j in range(i + 1, n) if dist_top[i, j] >= 3]
    # chiralita'
    chirali = []
    for a in range(n):
        if m.chir[a] and len(m.ordine_vicini[a]) == 4 and None not in m.ordine_vicini[a]:
            ov = list(m.ordine_vicini[a])
            chirali.append((ov, a, -1.0 if m.chir[a] == '@' else 1.0))

    D_i = np.array([t[0] for t in termini_d], dtype=int); D_j = np.array([t[1] for t in termini_d], dtype=int)
    D_0 = np.array([t[2] for t in termini_d]); D_k = np.array([t[3] for t in termini_d])
    if coppie_nb:
        N_i = np.array([c[0] for c in coppie_nb]); N_j = np.array([c[1] for c in coppie_nb]); N_0 = np.array([c[2] for c in coppie_nb])
    T = np.array([t[:4] for t in torsioni], dtype=int).reshape(-1, 4)
    T_n = np.array([t[4] for t in torsioni]); T_f = np.array([t[5] for t in torsioni]); T_k = np.array([t[6] for t in torsioni])
    if repulsioni_vsepr:
        V_i = np.array([r[0] for r in repulsioni_vsepr]); V_j = np.array([r[1] for r in repulsioni_vsepr]); V_w = np.array([r[2] for r in repulsioni_vsepr])

    def energia(x, completa=True, chir=True):
        X = x.reshape(nt, 3)
        G = np.zeros_like(X)
        E = 0.0
        d = X[D_i] - X[D_j]
        r = np.linalg.norm(d, axis=1) + 1e-9
        dr = r - D_0
        E += np.sum(D_k * dr * dr)
        f = (2 * D_k * dr / r)[:, None] * d
        np.add.at(G, D_i, f); np.add.at(G, D_j, -f)
        if repulsioni_vsepr:
            d = X[V_i] - X[V_j]; r = np.linalg.norm(d, axis=1) + 1e-9
            E += np.sum(V_w / r)
            f = (-V_w / r ** 3)[:, None] * d
            np.add.at(G, V_i, f); np.add.at(G, V_j, -f)
        if completa and coppie_nb:
            d = X[N_i] - X[N_j]; r = np.linalg.norm(d, axis=1) + 1e-9
            dr = np.minimum(r - N_0, 0)
            E += np.sum(20.0 * dr * dr)
            f = (40.0 * dr / r)[:, None] * d
            np.add.at(G, N_i, f); np.add.at(G, N_j, -f)
        if completa and len(T):
            p0, p1, p2, p3 = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]], X[T[:, 3]]
            b1, b2, b3 = p1 - p0, p2 - p1, p3 - p2
            n1, n2 = np.cross(b1, b2), np.cross(b2, b3)
            lb2 = np.linalg.norm(b2, axis=1) + 1e-9
            n1q = np.sum(n1 * n1, axis=1) + 1e-9; n2q = np.sum(n2 * n2, axis=1) + 1e-9
            phi = np.arctan2(lb2 * np.sum(b1 * n2, axis=1), np.sum(n1 * n2, axis=1))
            # energia: forza * (1 - cos(n*phi - fase)) per torsioni coniugate/stereo, forza*(1+cos 3phi) per sfalsate
            segno = np.where(T_n == 3, -1.0, 1.0)
            E += np.sum(T_k * (1 - segno * np.cos(T_n * phi - T_f)))
            dE = T_k * segno * T_n * np.sin(T_n * phi - T_f)
            g0 = -(lb2 / n1q)[:, None] * n1
            g3 = (lb2 / n2q)[:, None] * n2
            a = (np.sum(b1 * b2, axis=1) / lb2 ** 2)[:, None]
            c = (np.sum(b3 * b2, axis=1) / lb2 ** 2)[:, None]
            g1 = (a - 1) * g0 - c * g3
            g2 = (c - 1) * g3 - a * g0
            for idx, g in ((0, g0), (1, g1), (2, g2), (3, g3)):
                np.add.at(G, T[:, idx], dE[:, None] * g)
        if chir:
            for ov, cen, s in chirali:
                p0, p1, p2, p3 = X[ov[0]], X[ov[1]], X[ov[2]], X[ov[3]]
                c = X[cen]
                u, v, w = p2 - p1, p3 - p1, c - p0
                cr = np.cross(u, v)
                V = np.dot(cr, w)
                viol = min(0.0, s * V)
                if viol < 0:
                    E += 30.0 * viol * viol
                    k2 = 60.0 * viol * s
                    G[ov[0]] += k2 * -cr
                    G[cen] += k2 * cr
                    gu = np.cross(v, w); gv = np.cross(w, u)
                    G[ov[2]] += k2 * gu
                    G[ov[3]] += k2 * gv
                    G[ov[1]] += k2 * (-gu - gv)
        return E, G.ravel()

    geometria.energia = energia
    geometria.nt = nt
    rng = np.random.default_rng(seme)
    migliore = None
    if not termini_d:
        migliore = (0.0, np.zeros((n, 3)))
        partenze = 0
    def violazioni(X):
        v = 0
        for ov, cen, s in chirali:
            V = np.dot(np.cross(X[ov[2]] - X[ov[1]], X[ov[3]] - X[ov[1]]), X[cen] - X[ov[0]])
            v += s * V <= 0
        return v
    if chirali:
        partenze = max(partenze, 10)
    for p in range(partenze):
        x0 = rng.normal(size=(nt, 3)) * (1.0 + 0.55 * nt ** (1 / 3))
        # prima solo legami, angoli e chiralita' (le molecole si "districano"), poi il campo di forze completo
        r1 = minimize(lambda x: energia(x, False, True), x0.ravel(), jac=True, method='L-BFGS-B', options={'maxiter': 3000})
        r2 = minimize(energia, r1.x, jac=True, method='L-BFGS-B', options={'maxiter': 6000})
        Xp = r2.x.reshape(nt, 3)
        punteggio = r2.fun + 1000 * violazioni(Xp)
        if migliore is None or punteggio < migliore[0]:
            migliore = (punteggio, Xp[:n].copy())
    X = migliore[1]
    # piu' frammenti (per esempio gli ioni di un sale): si dispongono vicini, senza sovrapporsi
    comp = [-1] * n
    nc = 0
    for s0 in range(n):
        if comp[s0] < 0:
            pila = [s0]; comp[s0] = nc
            while pila:
                u = pila.pop()
                for v in vic[u]:
                    if comp[v] < 0:
                        comp[v] = nc; pila.append(v)
            nc += 1
    if nc > 1:
        gruppi = [[a for a in range(n) if comp[a] == c] for c in range(nc)]
        gruppi.sort(key=len, reverse=True)
        raggio = lambda g, C: max(np.linalg.norm(X[a] - C) + 0.85 * VDW.get(m.el[a], 1.6) for a in g)
        C0 = X[gruppi[0]].mean(axis=0)
        X[gruppi[0]] -= C0
        r0 = raggio(gruppi[0], np.zeros(3))
        oro = math.pi * (3 - math.sqrt(5))
        for k, g in enumerate(gruppi[1:]):
            Cg = X[g].mean(axis=0)
            rg = raggio(g, Cg)
            y = 1 - 2 * (k + 0.5) / (len(gruppi) - 1)
            rr = math.sqrt(max(0, 1 - y * y))
            d = np.array([math.cos(k * oro) * rr, y, math.sin(k * oro) * rr])
            X[g] += d * (r0 + rg + 0.3) - Cg
    X -= X.mean(axis=0)
    return X, migliore[0]


def costruisci(smiles, **kw):
    m = aromatizza(aggiungi_idrogeni(leggi_smiles(smiles)))
    X, E = geometria(m, **kw)
    return m, X, E


def formula(m):
    from collections import Counter
    c = Counter(m.el)
    return c


if __name__ == '__main__':
    import sys
    m, X, E = costruisci(sys.argv[1])
    print(len(m.el), 'atomi, energia', round(E, 3))
    for e, p in zip(m.el, X):
        print(e, *[round(v, 3) for v in p])
