# Atlante della materia

*In inglese: Atlas of Matter.*

App educativa per studenti delle superiori: i 118 elementi chimici conosciuti, ognuno con

- l'atomo in 3D, in tre viste: modello a gusci, nucleo (protoni e neutroni) e orbitali;
- quanti protoni, neutroni ed elettroni ha, e di quale isotopo;
- configurazione elettronica ed elettroni per guscio (K, L, M…);
- le proprietà principali: massa, stato, fusione ed ebollizione, densità, elettronegatività, energia di ionizzazione, affinità elettronica, raggio, stati di ossidazione;
- la storia della scoperta (chi, quando, come), gli usi e una curiosità.

L'app contiene già tutti i dati: non fa ricerche online e, una volta aperta, funziona anche senza connessione. Si può installare sulla schermata Home del telefono.

Indirizzo dell'app (dopo aver attivato GitHub Pages): https://blfrlrnz.github.io/Atlas-of-Matter-/

## Da dove vengono i dati

I numeri non sono calcolati da noi: vengono da banche dati scientifiche ufficiali, copiate nella cartella `dati/`.

| Dato | Fonte |
|---|---|
| Masse, raggi, elettronegatività, affinità elettronica, stati di ossidazione, stato, fusione, ebollizione, densità, famiglia | PubChem, *Periodic Table of Elements* (NIH, pubblico dominio): `dati/fonti/PubChemElements_all.csv` |
| Configurazioni elettroniche ed energie di prima ionizzazione (Z = 1–103) | NIST Atomic Spectra Database (tramite PDG 2024, tab. 5.1): `dati/nist_configurazioni.js` |
| Configurazioni degli elementi 104–118 | valori calcolati riportati da PubChem (segnalati nell'app come non misurati) |
| Isotopo più abbondante e sua abbondanza | IUPAC CIAAW, *Isotopic Compositions of the Elements*: `dati/isotopi.py` |
| Isotopo più stabile degli elementi senza isotopi stabili | IUPAC CIAAW, *Radioactive elements* (valutazione NUBASE2020): `dati/isotopi.py` |
| Storia, usi, curiosità (in italiano) | scritti per questa app a partire dalla cronologia delle scoperte degli elementi e dalle fonti che cita: `dati/testi_1.py` … `testi_4.py` |

Il programma che costruisce i dati confronta anche le fonti tra loro (anni di scoperta, energie di ionizzazione, configurazioni, masse) e stampa le differenze: dove NIST e PubChem non coincidono si usa NIST, che è più recente e preciso.

Gli orbitali sono disegnati con il modello dell'atomo di idrogeno: la forma è corretta, le dimensioni sono qualitative.

## Come è fatto

- `index.html`: l'app intera in un solo file (generato, non modificarlo a mano).
- `sorgenti/pagina.html` e `sorgenti/app.js`: pagina, stile e codice.
- `strumenti/costruisci_dati.py`: unisce le fonti in `dati/elementi.json`.
- `strumenti/costruisci.py`: genera `index.html` (con `--caratteri` rigenera anche i caratteri ridotti).
- `strumenti/icone.js`: disegna le icone.
- `sw.js` e `manifest.webmanifest`: installazione e funzionamento offline.
- `caratteri/`: DM Sans (SIL Open Font License, licenza inclusa).

Per ricostruire: `python3 strumenti/costruisci.py`

## Pubblicarla

Su GitHub: Settings → Pages → Source «Deploy from a branch» → branch `main`, cartella `/ (root)` → Save. Dopo un paio di minuti l'app è all'indirizzo qui sopra; dal telefono si apre il link e si sceglie «Aggiungi alla schermata Home».

## Prossimi passi

- Circa 300 molecole e materiali comuni con struttura 3D e scheda completa.
- Per ogni elemento, l'elenco dei composti noti che lo contengono.
