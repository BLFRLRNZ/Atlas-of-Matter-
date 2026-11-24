#!/usr/bin/env python3
"""Costruisce dati/materiali.json: formula, composizione, massa molare e modello 3D di ogni materiale.

- Composizione e massa molare: dalla formula, con le masse atomiche di PubChem/IUPAC (dati/elementi.json).
- Modello 3D: molecole da strumenti/molecole3d.py (verificato su FreeSolv), cristalli da strumenti/cristalli.py.
- Controllo: la formula scritta nella scheda deve coincidere con quella ricavata dalla struttura.
"""
import json, os, re, sys, time
from collections import Counter

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
sys.path.insert(0, os.path.join(QUI, '..', 'dati'))
import molecole3d as M3   # noqa: E402
import cristalli as K     # noqa: E402

ELEMENTI = json.load(open(os.path.join(QUI, '..', 'dati', 'elementi.json'), encoding='utf-8'))
Z = {e['s']: e['z'] for e in ELEMENTI}
MASSA = {e['s']: float(e['m']) for e in ELEMENTI}
CATEGORIE = [('gas', 'Aria, acqua e gas'), ('minerali', 'Sali, minerali e cristalli'), ('acidi', 'Acidi e basi'),
             ('combustibili', 'Combustibili e idrocarburi'), ('casa', 'Alcoli, solventi e prodotti di casa'),
             ('vita', 'Molecole della vita'), ('farmaci', 'Farmaci e sostanze attive'), ('natura', 'Aromi, sapori e profumi'),
             ('industria', 'Materiali, plastiche e industria')]


def conta_formula(f):
    """'CaSO4·2H2O', 'Ca3(PO4)2', 'H3O+' -> Counter degli elementi."""
    f = f.rstrip('+-')
    tot = Counter()
    for parte in f.split('·'):
        m = re.match(r'^(\d+)(.*)$', parte)
        k, parte = (int(m.group(1)), m.group(2)) if m else (1, parte)
        pila = [Counter()]
        for tok in re.findall(r'[A-Z][a-z]?\d*|\(|\)\d*', parte):
            if tok == '(':
                pila.append(Counter())
            elif tok.startswith(')'):
                n = int(tok[1:] or 1)
                c = pila.pop()
                for e in c:
                    pila[-1][e] += c[e] * n
            else:
                e, n = re.match(r'([A-Z][a-z]?)(\d*)', tok).groups()
                pila[-1][e] += int(n or 1)
        for e in pila[0]:
            tot[e] += pila[0][e] * k
    return tot


def main():
    voci = []
    for i in (1, 2, 3):
        voci += __import__('materiali_%d' % i).M
    ids = [v[0] for v in voci]
    doppi = {x for x in ids if ids.count(x) > 1}
    assert not doppi, doppi
    out, problemi, t0 = [], [], time.time()
    for (mid, nome, cat, struttura, formula, stato, descr, usi) in voci:
        attesa = conta_formula(formula)
        if struttura.startswith('cristallo:'):
            el, X, L = K.costruisci(struttura[len('cristallo:'):])
            tipo = 'cristallo'
            if set(el) != set(attesa):
                problemi.append('%s: elementi del cristallo %s diversi dalla formula %s' % (mid, set(el), dict(attesa)))
            cariche = [0] * len(el)
        else:
            m, X, E = M3.costruisci(struttura, partenze=4, seme=7)
            el, L, cariche = m.el, m.legami, m.carica
            tipo = 'molecola'
            trovata = Counter(el)
            if trovata != attesa:
                problemi.append('%s: formula scritta %s, dalla struttura %s' % (mid, dict(attesa), dict(trovata)))
            if E > 25:
                problemi.append('%s: energia di tensione alta (%.1f), controllare la struttura' % (mid, E))
        massa = sum(MASSA[e] * n for e, n in attesa.items())
        comp = sorted(([Z[e], n, round(100 * MASSA[e] * n / massa, 2)] for e, n in attesa.items()), key=lambda c: -c[2])
        out.append({
            'id': mid, 'n': nome, 'cat': cat, 'f': formula, 'st': stato, 'd': descr, 'u': usi, 'tipo': tipo,
            'mm': round(massa, 2), 'comp': comp,
            'a': [Z[e] for e in el], 'x': [round(float(v), 2) for p in X for v in p],
            'b': [[int(i), int(j), o] for i, j, o in L], 'q': [int(q) for q in cariche] if any(cariche) else None,
        })
    json.dump({'categorie': CATEGORIE, 'materiali': out}, open(os.path.join(QUI, '..', 'dati', 'materiali.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print('materiali.json: %d materiali in %.0f s' % (len(out), time.time() - t0))
    print('controlli (%d note):' % len(problemi))
    for p in problemi:
        print('  ' + p)


if __name__ == '__main__':
    main()
