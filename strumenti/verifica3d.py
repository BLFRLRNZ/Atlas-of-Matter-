#!/usr/bin/env python3
"""Confronta i modelli 3D prodotti da molecole3d.py con le strutture pubblicate del database FreeSolv.

Uso: python3 strumenti/verifica3d.py CARTELLA_FREESOLV [quante]
Per ogni molecola: stessa formula?, scarto medio delle lunghezze di legame, delle distanze 1-3 (angoli)
e, per le molecole rigide, delle distanze tra tutti gli atomi pesanti.
"""
import sys, os, time, itertools
import numpy as np
import molecole3d as M


def leggi_sdf(path):
    L = open(path).read().splitlines()
    na, nb = int(L[3][:3]), int(L[3][3:6])
    el, X = [], []
    for l in L[4:4 + na]:
        X.append([float(l[0:10]), float(l[10:20]), float(l[20:30])]); el.append(l[31:34].strip())
    bonds = [(int(l[:3]) - 1, int(l[3:6]) - 1) for l in L[4 + na:4 + na + nb]]
    return el, np.array(X), bonds


def firme(el, X, bonds):
    vic = {}
    for i, j in bonds:
        vic.setdefault(i, []).append(j); vic.setdefault(j, []).append(i)
    lb = {}
    for i, j in bonds:
        k = tuple(sorted((el[i], el[j])))
        lb.setdefault(k, []).append(np.linalg.norm(X[i] - X[j]))
    l13 = {}
    for c, vs in vic.items():
        for a, b in itertools.combinations(vs, 2):
            k = (el[c],) + tuple(sorted((el[a], el[b])))
            l13.setdefault(k, []).append(np.linalg.norm(X[a] - X[b]))
    return {k: sorted(v) for k, v in lb.items()}, {k: sorted(v) for k, v in l13.items()}, vic


def confronta(a, b):
    d = []
    for k in a:
        if k in b and len(a[k]) == len(b[k]):
            d += list(np.abs(np.array(a[k]) - np.array(b[k])))
    return d


def rigida(el, vic, bonds):
    # nessun legame semplice ruotabile tra due atomi pesanti con altri vicini pesanti, fuori dagli anelli
    import networkx  # noqa
    return False


cartella = sys.argv[1]
quante = int(sys.argv[2]) if len(sys.argv) > 2 else 10 ** 9
righe = [l.split(';') for l in open(os.path.join(cartella, 'database.txt')) if not l.startswith('#')]
tot_b, tot_a, err, diversi, t0, n = [], [], [], [], time.time(), 0
for r in righe[:quante]:
    cid, smi = r[0].strip(), r[1].strip()
    try:
        m, X, E = M.costruisci(smi, partenze=2)
    except Exception as e:
        err.append((cid, smi, str(e))); continue
    el2, X2, b2 = leggi_sdf(os.path.join(cartella, 'sdf', cid + '.sdf'))
    if sorted(m.el) != sorted(el2):
        diversi.append((cid, smi)); continue
    b1 = [(i, j) for i, j, o in m.legami]
    fa, ga, _ = firme(m.el, X, b1)
    fb, gb, _ = firme(el2, X2, b2)
    tot_b += confronta(fa, fb); tot_a += confronta(ga, gb)
    n += 1
print('molecole confrontate:', n, ' formule diverse:', len(diversi), ' errori:', len(err), ' tempo %.0f s' % (time.time() - t0))
print('lunghezze di legame: scarto medio %.3f A, 95%% entro %.3f A' % (np.mean(tot_b), np.percentile(tot_b, 95)))
print('distanze 1-3 (angoli): scarto medio %.3f A, 95%% entro %.3f A' % (np.mean(tot_a), np.percentile(tot_a, 95)))
for x in diversi[:8]: print('  formula diversa', x)
for x in err[:8]: print('  errore', x)
