#!/usr/bin/env python3
"""Costruisce index.html: unisce sorgenti/pagina.html, sorgenti/app.js e dati/elementi.json.

Uso:
  python3 strumenti/costruisci.py              # dati + pagina
  python3 strumenti/costruisci.py --caratteri  # rigenera anche i caratteri ridotti in caratteri/
"""
import json, os, subprocess, sys

RADICE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
P = lambda *a: os.path.join(RADICE, *a)

subprocess.run([sys.executable, P('strumenti', 'costruisci_dati.py')], check=True)

pagina = open(P('sorgenti', 'pagina.html'), encoding='utf-8').read()
app = open(P('sorgenti', 'app.js'), encoding='utf-8').read()
dati = open(P('dati', 'elementi.json'), encoding='utf-8').read()
materiali = open(P('dati', 'materiali.json'), encoding='utf-8').read()

if '--caratteri' in sys.argv:
    # Carattere libero (SIL Open Font License): DM Sans variabile, ridotto ai glifi usati.
    from fontTools import subset
    from fontTools.ttLib import TTFont
    usati = set(pagina + app + dati + materiali) | set(chr(c) for c in range(0x20, 0x7F)) | set(chr(c) for c in range(0xA0, 0x180))
    usati |= set('⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉−«»–—‘’“”…°×≈±·')
    testo = ''.join(sorted(c for c in usati if c >= ' '))
    G = '/usr/share/fonts/truetype/google-fonts/ofl/'
    os.makedirs(P('caratteri'), exist_ok=True)
    for src, dst in [(G + 'dmsans/DMSans[opsz,wght].ttf', 'dm-sans.woff')]:
        opt = subset.Options()
        opt.flavor = 'woff'
        opt.layout_features = ['kern', 'liga', 'calt', 'ss01']
        opt.name_IDs = ['*']
        opt.notdef_outline = True
        f = TTFont(src)
        s = subset.Subsetter(opt)
        s.populate(text=testo)
        s.subset(f)
        f.flavor = 'woff'
        f.save(P('caratteri', dst))
        print('carattere', dst, os.path.getsize(P('caratteri', dst)) // 1024, 'kB')

html = pagina.replace('/*DATI*/', dati).replace('/*MATERIALI*/', materiali).replace('/*APP*/', app)
open(P('index.html'), 'w', encoding='utf-8').write(html)
print('index.html', len(html.encode('utf-8')) // 1024, 'kB')
