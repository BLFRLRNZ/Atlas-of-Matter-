#!/usr/bin/env python3
"""Frammenti di reticoli cristallini per i solidi ionici e covalenti a rete.

Ogni funzione restituisce (elementi, coordinate in angstrom, legami tra primi vicini).
Le costanti di reticolo sono valori sperimentali a temperatura ambiente (manuali di cristallografia).
"""
import itertools
import numpy as np

FCC = [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0)]


def _legami(X, dmax, el=None, solo_diversi=False):
    L = []
    for i in range(len(X)):
        for j in range(i + 1, len(X)):
            if solo_diversi and el[i] == el[j]:
                continue
            if np.linalg.norm(X[i] - X[j]) <= dmax:
                L.append((i, j, 1))
    return L


def _centra(X):
    X = np.array(X, dtype=float)
    return X - (X.max(axis=0) + X.min(axis=0)) / 2


def salgemma(A, B, a, n=4):
    """Struttura del cloruro di sodio: cubo di (n+1)^3 ioni alternati, passo a/2."""
    el, X = [], []
    for i, j, k in itertools.product(range(n + 1), repeat=3):
        el.append(A if (i + j + k) % 2 == 0 else B); X.append((i * a / 2, j * a / 2, k * a / 2))
    X = _centra(X)
    return el, X, _legami(X, a / 2 * 1.05)


def cloruro_cesio(A, B, a, n=2):
    el, X = [], []
    for i, j, k in itertools.product(range(n + 1), repeat=3):
        el.append(A); X.append((i * a, j * a, k * a))
    for i, j, k in itertools.product(range(n), repeat=3):
        el.append(B); X.append(((i + .5) * a, (j + .5) * a, (k + .5) * a))
    X = _centra(X)
    return el, X, _legami(X, a * np.sqrt(3) / 2 * 1.05, el, True)


def _fcc_punti(a, n):
    P = set()
    for i, j, k in itertools.product(range(n + 1), repeat=3):
        for f in FCC:
            p = (i + f[0], j + f[1], k + f[2])
            if all(c <= n + 1e-9 for c in p):
                P.add(p)
    return sorted(P)


def fluorite(A, B, a, n=1):
    """Fluorite (CaF2): cationi in reticolo cubico a facce centrate, anioni nei siti tetraedrici."""
    el, X = [], []
    for p in _fcc_punti(a, n):
        el.append(A); X.append(tuple(c * a for c in p))
    for i, j, k in itertools.product(range(n), repeat=3):
        for d in itertools.product((.25, .75), repeat=3):
            el.append(B); X.append(((i + d[0]) * a, (j + d[1]) * a, (k + d[2]) * a))
    X = _centra(X)
    return el, X, _legami(X, a * np.sqrt(3) / 4 * 1.05, el, True)


def blenda(A, B, a, n=1):
    """Blenda (ZnS) e, con A = B, diamante: due reticoli fcc spostati di (1/4, 1/4, 1/4)."""
    el, X = [], []
    for p in _fcc_punti(a, n):
        el.append(A); X.append(tuple(c * a for c in p))
    for p in _fcc_punti(a, n):
        q = tuple(c + .25 for c in p)
        if all(c <= n + 1e-9 for c in q):
            el.append(B); X.append(tuple(c * a for c in q))
    X = _centra(X)
    return el, X, _legami(X, a * np.sqrt(3) / 4 * 1.05)


def cristobalite(a=7.16):
    """Silice (SiO2) nella forma cristobalite ideale: silicio come nel diamante, ossigeno tra due atomi di silicio."""
    el_si, X_si, L = blenda('Si', 'Si', a, 1)
    el, X = list(el_si), [tuple(p) for p in X_si]
    legami = []
    for i, j, _ in L:
        el.append('O'); X.append(tuple((np.array(X_si[i]) + np.array(X_si[j])) / 2))
        o = len(el) - 1
        legami += [(i, o, 1), (j, o, 1)]
    return el, np.array(X), legami


def grafite(a=2.46, c=6.71, raggio=5.2):
    """Grafite: due strati di esagoni (impilamento ABAB), distanza tra strati c/2."""
    el, X = [], []
    a1, a2 = np.array([a, 0, 0]), np.array([a / 2, a * np.sqrt(3) / 2, 0])
    base = [np.zeros(3), (a1 + a2) / 3]
    for strato, (dz, sh) in enumerate([(0, np.zeros(3)), (c / 2, (a1 + a2) / 3)]):
        for i, j in itertools.product(range(-6, 7), repeat=2):
            for b in base:
                p = i * a1 + j * a2 + b + sh
                if np.hypot(p[0], p[1]) <= raggio:
                    el.append('C'); X.append((p[0], p[1], dz))
    X = _centra(X)
    L = [(i, j, 1.5) for i in range(len(X)) for j in range(i + 1, len(X))
         if abs(X[i][2] - X[j][2]) < .1 and np.linalg.norm(X[i] - X[j]) < 1.5]
    return el, X, L


def grafene(a=2.46, raggio=6.2):
    el, X, _ = grafite(a=a, raggio=raggio)
    X = np.array([p for e, p in zip(el, X) if abs(p[2] - X[:, 2].min()) < .1])
    X = X - X.mean(axis=0)
    L = [(i, j, 1.5) for i in range(len(X)) for j in range(i + 1, len(X)) if np.linalg.norm(X[i] - X[j]) < 1.5]
    return ['C'] * len(X), X, L


def fullerene(cc=1.42):
    """C60: i vertici dell'icosaedro troncato (permutazioni pari delle coordinate note), lato = legame C-C."""
    f = (1 + 5 ** .5) / 2
    basi = [(0, 1, 3 * f), (1, 2 + f, 2 * f), (f, 2, 2 * f + 1)]
    P = set()
    for b in basi:
        for perm in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
            v = [b[perm[0]], b[perm[1]], b[perm[2]]]
            for sg in itertools.product((1, -1), repeat=3):
                P.add(tuple(round(v[k] * sg[k], 6) for k in range(3)))
    X = np.array(sorted(P)) * (cc / 2)
    L = [(i, j, 1.5) for i in range(len(X)) for j in range(i + 1, len(X)) if np.linalg.norm(X[i] - X[j]) < cc * 1.1]
    return ['C'] * len(X), X, L


def costruisci(spec):
    """spec: 'tipo:A:B:a' (es. 'salgemma:Na:Cl:5.640')."""
    parti = spec.split(':')
    tipo = parti[0]
    if tipo == 'grafite':
        return grafite()
    if tipo == 'grafene':
        return grafene()
    if tipo == 'fullerene':
        return fullerene()
    if tipo == 'cristobalite':
        return cristobalite()
    if tipo == 'diamante':
        return blenda(parti[1], parti[1], float(parti[2]), 1)
    A, B, a = parti[1], parti[2], float(parti[3])
    return {'salgemma': salgemma, 'cloruro_cesio': cloruro_cesio, 'fluorite': fluorite, 'blenda': blenda}[tipo](A, B, a)
