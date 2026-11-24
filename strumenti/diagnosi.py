import sys, numpy as np
sys.path.insert(0, '.'); sys.path.insert(0, '../dati')
import molecole3d as M
voci = []
for i in (1, 2, 3): voci += __import__('materiali_%d' % i).M
nomi = sys.argv[1:]
for v in voci:
    if nomi and v[0] not in nomi: continue
    if v[3].startswith('cristallo'): continue
    m, X, E = M.costruisci(v[3], partenze=4, seme=7)
    n = len(m.el)
    dev = max(abs(np.linalg.norm(X[i]-X[j]) - M.lunghezza(m.el[i], m.el[j], o)) for i, j, o in m.legami) if m.legami else 0
    viol = 0; tot = 0
    for a in range(n):
        ov = m.ordine_vicini[a]
        if m.chir[a] and len(ov) == 4 and None not in ov:
            tot += 1
            p0, p1, p2, p3 = (X[k] for k in ov)
            V = np.dot(np.cross(p2 - p1, p3 - p1), X[a] - p0)
            s = -1 if m.chir[a] == '@' else 1
            if s * V <= 0: viol += 1
    vic = {}
    for i, j, o in m.legami: vic.setdefault(i, set()).add(j); vic.setdefault(j, set()).add(i)
    dmin = 9
    for i in range(n):
        for j in range(i + 1, n):
            if j in vic.get(i, ()) or vic.get(i, set()) & vic.get(j, set()): continue
            dmin = min(dmin, np.linalg.norm(X[i] - X[j]))
    if nomi or dev > 0.08 or viol or dmin < 1.6:
        print(f'{v[0]:24s} E {E:7.1f}  scarto legami max {dev:.3f}  chirali violati {viol}/{tot}  distanza minima non legati {dmin:.2f}')
