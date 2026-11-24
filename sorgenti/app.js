'use strict';
/* Atlante della materia: tavola, ricerca, scheda elemento e visore 3D (canvas 2D, nessuna libreria). */

const FAMIGLIE = [
  ['Metallo alcalino', '--alcalino'], ['Metallo alcalino-terroso', '--alcalino-terroso'],
  ['Metallo di transizione', '--transizione'], ['Metallo post-transizionale', '--post-transizione'],
  ['Semimetallo', '--semimetallo'], ['Non metallo', '--non-metallo'], ['Alogeno', '--alogeno'],
  ['Gas nobile', '--gas-nobile'], ['Lantanide', '--lantanide'], ['Attinide', '--attinide'],
];
const COLORE = Object.fromEntries(FAMIGLIE.map(([n, v]) => [n, 'var(' + v + ')']));
const VAR_COLORE = Object.fromEntries(FAMIGLIE);
const pedici = (s) => s.replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (m) => '<sub>' + [...m].map((c) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).join('') + '</sub>');
const apici = (s) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '<sup>' + [...m].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join('') + '</sup>');
const PLURALE = {'Metallo alcalino': 'Metalli alcalini', 'Metallo alcalino-terroso': 'Metalli alcalino-terrosi',
  'Metallo di transizione': 'Metalli di transizione', 'Metallo post-transizionale': 'Metalli post-transizionali',
  'Semimetallo': 'Semimetalli', 'Non metallo': 'Non metalli', 'Alogeno': 'Alogeni', 'Gas nobile': 'Gas nobili',
  'Lantanide': 'Lantanidi', 'Attinide': 'Attinidi'};
const $ = (id) => document.getElementById(id);
const MENO_MOTO = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- formattazione ---------- */
function numero(x, dec) {
  let s = Math.abs(x).toFixed(dec);
  let [i, d] = s.split('.');
  if (i.length > 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (x < 0 ? '−' : '') + i + (d ? ',' + d : '');
}
function significative(x, n) {
  if (x === 0) return '0';
  const dec = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(x))));
  return numero(x, Math.min(dec, 6));
}
const ignoto = (t) => '<span class="ignoto">' + (t || 'non noto') + '</span>';
function articolo(nome) {
  const n = nome.toLowerCase();
  if (/^[aeiouh]/.test(n)) return "dell'" + n;
  if (/^(s[^aeiou]|z|x|gn|ps|pn|y)/.test(n)) return 'dello ' + n;
  return 'del ' + n;
}
function percento(ab) {
  const v = ab.replace(/[\[\]]/g, '').split(';').map((x) => parseFloat(x.trim().replace(',', '.')));
  const fmt = (x, d) => (x === 1 ? '100' : numero(x * 100, d).replace(/,?0+$/, '')) + '%';
  let d = 1;
  const ok = (x) => x === 1 || x * 100 < 99.95 || parseFloat((x * 100).toFixed(d)) < 100;
  while (d < 5 && (!v.every(ok) || (v.length === 2 && fmt(v[0], d) === fmt(v[1], d)))) d++;
  if (v.length === 2) return 'tra il ' + fmt(v[0], d) + ' e il ' + fmt(v[1], d);
  return 'il ' + fmt(v[0], d);
}
/* ---------- tavola ---------- */
const tavola = $('tavola');
function costruisciTavola() {
  const frag = document.createDocumentFragment();
  const add = (el, r, c) => { el.style.gridRow = r; el.style.gridColumn = c; frag.appendChild(el); };
  for (let g = 1; g <= 18; g++) { const d = document.createElement('div'); d.className = 'gr'; d.textContent = g; d.setAttribute('aria-hidden', 'true'); add(d, 1, g + 1); }
  for (let p = 1; p <= 7; p++) { const d = document.createElement('div'); d.className = 'pe'; d.textContent = p; d.setAttribute('aria-hidden', 'true'); add(d, p + 1, 1); }
  const sep = document.createElement('div'); sep.className = 'f-sep'; add(sep, 9, '1 / -1');
  for (const [r, txt, fam] of [[7, '57–71', 'Lantanide'], [8, '89–103', 'Attinide']]) {
    const d = document.createElement('div'); d.className = 'cella segnaposto'; d.style.setProperty('--c', COLORE[fam]);
    d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<span class="cn" style="display:block">' + txt + '</span>'; add(d, r, 4);
  }
  for (const e of ELEMENTI) {
    const b = document.createElement('button');
    b.className = 'cella'; b.dataset.z = e.z; b.style.setProperty('--c', COLORE[e.cat]);
    b.setAttribute('aria-label', e.z + ', ' + e.n + ', ' + e.s);
    b.innerHTML = '<span class="cz">' + e.z + '</span>' + e.s + '<span class="cn">' + e.n + '</span>';
    add(b, e.row < 9 ? e.row + 1 : e.row + 1, e.col + 1);
  }
  tavola.appendChild(frag);
  tavola.addEventListener('click', (ev) => {
    const c = ev.target.closest('.cella[data-z]');
    if (c && !tocco.attivo) apri(+c.dataset.z);
  });
}

/* lente sulla tavola: con il dito appoggiato mostra l'elemento sotto il dito, al rilascio lo apre */
const lente = $('lente');
const tocco = { attivo: false, z: 0 };
function sottoDito(x, y) {
  const el = document.elementFromPoint(x, y);
  const c = el && el.closest && el.closest('.cella[data-z]');
  return c ? +c.dataset.z : 0;
}
let cellaSotto = null;
function mostraLente(x, y, z) {
  if (cellaSotto) cellaSotto.classList.remove('sotto');
  cellaSotto = z ? tavola.querySelector('.cella[data-z="' + z + '"]') : null;
  if (cellaSotto) cellaSotto.classList.add('sotto');
  if (!z) { lente.hidden = true; return; }
  const e = ELEMENTI[z - 1];
  lente.style.setProperty('--c', COLORE[e.cat]);
  lente.innerHTML = '<div class="lz">' + e.z + '</div><div class="ls">' + e.s + '</div><div class="ln">' + e.n +
    '</div><div class="lc">' + e.cat + '</div>';
  lente.hidden = false;
  const w = lente.offsetWidth, h = lente.offsetHeight;
  let lx = Math.min(Math.max(8, x - w / 2), innerWidth - w - 8);
  let ly = y - h - 56; if (ly < 8) ly = y + 48;
  lente.style.left = lx + 'px'; lente.style.top = ly + 'px';
}
const wrap = document.querySelector('.tavola-wrap');
wrap.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'mouse') return;
  tocco.attivo = true; tocco.z = sottoDito(ev.clientX, ev.clientY);
  try { wrap.setPointerCapture(ev.pointerId); } catch (_) { /* puntatore gia' rilasciato */ }
  mostraLente(ev.clientX, ev.clientY, tocco.z);
});
wrap.addEventListener('pointermove', (ev) => {
  if (!tocco.attivo) return;
  tocco.z = sottoDito(ev.clientX, ev.clientY);
  mostraLente(ev.clientX, ev.clientY, tocco.z);
});
function fineTocco(apriloh) {
  if (!tocco.attivo) return;
  lente.hidden = true;
  if (cellaSotto) { cellaSotto.classList.remove('sotto'); cellaSotto = null; }
  const z = tocco.z;
  setTimeout(() => { tocco.attivo = false; }, 0);
  if (apriloh && z) apri(z);
}
wrap.addEventListener('pointerup', () => fineTocco(true));
wrap.addEventListener('pointercancel', () => fineTocco(false));

/* legenda: evidenzia una famiglia */
let famigliaAttiva = null;
function costruisciLegenda() {
  const l = $('legenda');
  for (const [nome] of FAMIGLIE) {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--c', COLORE[nome]);
    b.innerHTML = '<i></i>' + PLURALE[nome];
    b.onclick = () => {
      famigliaAttiva = famigliaAttiva === nome ? null : nome;
      for (const x of l.children) x.setAttribute('aria-pressed', String(x === b && famigliaAttiva !== null));
      $('cerca').value = ''; $('risultati').innerHTML = '';
      evidenzia((e) => !famigliaAttiva || e.cat === famigliaAttiva);
    };
    l.appendChild(b);
  }
}
function evidenzia(filtro) {
  for (const c of tavola.querySelectorAll('.cella[data-z]')) c.classList.toggle('attenuata', !filtro(ELEMENTI[c.dataset.z - 1]));
}

/* ricerca */
const normalizza = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
$('cerca').addEventListener('input', (ev) => {
  if (sezione === 'materiali') { mostraListaMateriali(); return; }
  const q = normalizza(ev.target.value);
  const ris = $('risultati');
  ris.innerHTML = '';
  if (famigliaAttiva) { famigliaAttiva = null; for (const x of $('legenda').children) x.setAttribute('aria-pressed', 'false'); }
  if (!q) { evidenzia(() => true); return; }
  const corrisponde = (e) => String(e.z) === q || normalizza(e.s) === q || normalizza(e.n).startsWith(q) ||
    normalizza(e.en).startsWith(q) || (q.length > 2 && normalizza(e.n).includes(q));
  const trovati = ELEMENTI.filter(corrisponde);
  trovati.sort((a, b) => (normalizza(b.s) === q) - (normalizza(a.s) === q));
  evidenzia(corrisponde);
  if (!trovati.length) { ris.innerHTML = '<li class="vuoto">Nessun elemento corrisponde a «' + ev.target.value.replace(/[<&]/g, '') + '».</li>'; return; }
  for (const e of trovati.slice(0, 6)) {
    const li = document.createElement('li');
    li.style.setProperty('--c', COLORE[e.cat]);
    li.innerHTML = '<button><span class="rz">' + e.z + '</span><span class="rs">' + e.s + '</span><span>' + e.n + '</span></button>';
    li.firstChild.onclick = () => apri(e.z);
    ris.appendChild(li);
  }
});
$('cerca').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const b = sezione === 'materiali' ? $('lista-materiali').querySelector('button') : $('risultati').querySelector('button');
  if (b) b.click();
});

/* ---------- navigazione ---------- */
function apri(z) { location.hash = '#/' + z; }
let sezione = 'elementi';
function mostraVista(id) {
  for (const v of ['vista-tavola', 'vista-elemento', 'vista-materiale']) $(v).hidden = v !== id;
  if (id !== 'vista-elemento') visore.ferma();
  if (id !== 'vista-materiale') visoreMat.ferma();
}
function impostaSezione(s) {
  const cambia = sezione !== s;
  sezione = s;
  for (const b of document.querySelectorAll('.schede-home button')) b.setAttribute('aria-selected', String(b.dataset.sezione === s));
  $('sezione-elementi').hidden = s !== 'elementi';
  $('sezione-materiali').hidden = s !== 'materiali';
  $('cerca').placeholder = s === 'materiali' ? 'Cerca un materiale per nome o formula' : 'Cerca per nome, simbolo o numero';
  if (cambia) { $('cerca').value = ''; $('risultati').innerHTML = ''; evidenzia(() => true); }
  if (s === 'materiali') mostraListaMateriali();
}
function instrada() {
  const h = location.hash;
  let m;
  if ((m = h.match(/^#\/(\d+)$/)) && +m[1] >= 1 && +m[1] <= 118) {
    mostraVista('vista-elemento');
    mostraElemento(ELEMENTI[+m[1] - 1]);
    scrollTo(0, 0);
  } else if ((m = h.match(/^#\/m\/([\w-]+)$/)) && PER_ID[m[1]]) {
    mostraVista('vista-materiale');
    mostraMateriale(PER_ID[m[1]]);
    scrollTo(0, 0);
  } else {
    mostraVista('vista-tavola');
    impostaSezione(h === '#/materiali' ? 'materiali' : 'elementi');
    document.title = 'Atlante della materia';
  }
}
for (const b of document.querySelectorAll('.schede-home button')) {
  b.onclick = () => { location.hash = b.dataset.sezione === 'materiali' ? '#/materiali' : '#/'; };
}
$('torna').onclick = () => { location.hash = '#/'; };
addEventListener('hashchange', instrada);

/* ---------- scheda elemento ---------- */
const LETTERE_GUSCI = 'KLMNOPQ';
let corrente = null;
function mostraElemento(e) {
  corrente = e;
  document.title = e.n + ' (' + e.s + ') · Atlante della materia';
  const prec = ELEMENTI[e.z - 2], succ = ELEMENTI[e.z];
  $('prec').hidden = !prec; $('succ').hidden = !succ;
  if (prec) { $('prec').querySelector('span').innerHTML = '<b>' + prec.s + '</b>'; $('prec').setAttribute('aria-label', 'Elemento precedente: ' + prec.n); $('prec').onclick = () => apri(prec.z); }
  if (succ) { $('succ').querySelector('span').innerHTML = '<b>' + succ.s + '</b>'; $('succ').setAttribute('aria-label', 'Elemento successivo: ' + succ.n); $('succ').onclick = () => apri(succ.z); }

  $('vista-elemento').style.setProperty('--c', COLORE[e.cat]);
  $('numero').textContent = 'Numero atomico ' + e.z;
  $('simbolo').textContent = e.s;
  $('nome').textContent = e.n;
  $('inglese').textContent = 'In inglese: ' + e.en;
  $('famiglia').innerHTML = '<i></i>' + e.cat +
    (e.g ? ', gruppo ' + e.g : (e.cat === 'Lantanide' ? ', serie dei lantanidi' : ', serie degli attinidi')) + ', periodo ' + e.p;

  $('composizione').innerHTML =
    '<div style="--k:var(--protone)"><b>' + e.z + '</b><span>' + (e.z === 1 ? 'protone' : 'protoni') + '</span></div>' +
    '<div style="--k:var(--neutrone)"><b>' + e.N + '</b><span>' + (e.N === 1 ? 'neutrone' : 'neutroni') + '</span></div>' +
    '<div style="--k:var(--elettrone)"><b>' + e.z + '</b><span>' + (e.z === 1 ? 'elettrone' : 'elettroni') + '</span></div>';
  const nomeIso = e.n.toLowerCase() + '-' + e.A;
  let iso;
  if (e.ab) {
    iso = 'Protoni ed elettroni sono sempre ' + e.z + ' (nell\'atomo neutro). I neutroni possono variare: qui sono quelli dell\'isotopo più abbondante, ' +
      nomeIso + ', che costituisce ' + percento(e.ab) + ' ' + articolo(e.n) + ' naturale' + (e.ab.startsWith('[') ? ' (la quota varia un po\' secondo la provenienza).' : '.');
    if ([90, 91, 92].includes(e.z)) iso += ' Tutti i suoi isotopi sono radioattivi.';
  } else {
    iso = 'Protoni ed elettroni sono sempre ' + e.z + ' (nell\'atomo neutro). L\'elemento non ha isotopi stabili: i neutroni sono quelli dell\'isotopo più stabile, ' +
      nomeIso + ', che si dimezza in ' + e.t + '.';
  }
  $('isotopo').textContent = iso;

  $('gusci').innerHTML = e.gusci.map((n, i) => '<div><dt>' + LETTERE_GUSCI[i] + '</dt><dd>' + n + '</dd></div>').join('');
  $('config').innerHTML = apici(e.conf);
  $('config-fonte').textContent = 'Configurazione elettronica dello stato fondamentale. Elettroni per guscio, dal più interno (K) al più esterno. ' +
    (e.cf === 'NIST' ? 'Fonte: NIST.' : 'Valore calcolato, non ancora misurato (fonte: PubChem).');

  $('proprieta').innerHTML = proprieta(e);
  $('descrizione').innerHTML = pedici(e.descr);
  $('anno').textContent = e.anno;
  $('chi').textContent = e.chi;
  $('storia').textContent = e.storia;
  $('usi').textContent = e.usi;
  $('curiosita').textContent = e.cur;
  mostraNeiMateriali(e);

  costruisciOrbitali(e);
  visore.carica(e);
  impostaVista(vistaCorrente);
}

function temperatura(k) {
  if (k == null) return ignoto();
  const c = k - 273.15;
  return numero(c, Math.abs(c) < 100 ? 1 : 0) + ' °C <small>(' + numero(k, k < 100 ? 2 : 0) + ' K)</small>';
}
function proprieta(e) {
  const gas = /gas/i.test(e.st);
  const voci = [
    ['Massa atomica', e.stab ? numero(parseFloat(e.m), (e.m.split('.')[1] || '').length) + ' u' : '[' + e.A + '] <small>numero di massa</small>',
      e.stab ? 'Massa media di un atomo, in unità di massa atomica.' : 'Senza isotopi stabili si indica il numero di massa dell\'isotopo più stabile.'],
    ['Stato a temperatura ambiente', e.st.startsWith('Previsto') ? '<span class="ignoto">' + e.st.toLowerCase() + '</span>' : e.st, ''],
    ['Fusione', temperatura(e.mp), e.z === 2 ? 'L\'elio solidifica solo sotto pressione.' : ''],
    ['Ebollizione', temperatura(e.bp), ''],
    ['Densità', e.d == null ? ignoto('non misurata') : (gas ? significative(e.d * 1000, 3) + ' g/L' : significative(e.d, 4) + ' g/cm³'),
      gas ? 'Per i gas si indica in grammi per litro.' : ''],
    ['Elettronegatività', e.eneg == null ? ignoto() : numero(e.eneg, 2),
      'Scala di Pauling: quanto l\'atomo attira verso di sé gli elettroni di un legame.'],
    ['Energia di prima ionizzazione', e.ie == null ? ignoto('non misurata') : numero(e.ie, 2) + ' eV <small>(' + numero(e.ie * 96.4853, 0) + ' kJ/mol)</small>',
      'Energia necessaria per strappare l\'elettrone più esterno all\'atomo isolato.'],
    ['Affinità elettronica', e.ea == null ? ignoto() : numero(e.ea, 2) + ' eV <small>(' + numero(e.ea * 96.4853, 0) + ' kJ/mol)</small>',
      'Energia liberata quando l\'atomo isolato acquista un elettrone.'],
    ['Raggio atomico', e.r == null ? ignoto() : e.r + ' pm', 'Raggio di van der Waals, in picometri (miliardesimi di millimetro).'],
    ['Stati di ossidazione', e.ox ? e.ox.replace(/\s*,\s*/g, ', ') : ignoto(), 'Le cariche che l\'atomo assume più spesso nei composti.'],
    ['Posizione', (e.g ? 'Gruppo ' + e.g : (e.cat === 'Lantanide' ? 'Lantanidi' : 'Attinidi')) + ', periodo ' + e.p + ', blocco ' + e.b, ''],
  ];
  return voci.map(([t, v, p]) => '<div><dt>' + t + '</dt><dd>' + v + '</dd>' + (p ? '<p>' + p + '</p>' : '') + '</div>').join('');
}

/* ---------- viste del visore ---------- */
let vistaCorrente = 'atomo';
const schede = document.querySelectorAll('.schede button');
for (const b of schede) b.onclick = () => impostaVista(b.dataset.vista);
function impostaVista(v) {
  vistaCorrente = v;
  for (const b of schede) b.setAttribute('aria-selected', String(b.dataset.vista === v));
  $('scelta-orbitali').hidden = v !== 'orbitali';
  visore.vista(v);
  aggiornaDidascalia();
}
const NOMI_M = {
  s: ['s'], p: ['px', 'py', 'pz'], d: ['dxy', 'dyz', 'dxz', 'dx²−y²', 'dz²'],
  f: ['fz³', 'fxz²', 'fyz²', 'fxyz', 'fz(x²−y²)', 'fx(x²−3y²)', 'fy(3x²−y²)'],
};
const scelta = { sub: '1s', m: 0 };
function costruisciOrbitali(e) {
  const box = $('sottolivelli');
  box.innerHTML = '';
  scelta.sub = e.sub[e.sub.length - 1][0];
  scelta.m = 0;
  for (const [s, n] of e.sub) {
    const b = document.createElement('button');
    b.innerHTML = s + '<sup>' + n + '</sup>';
    b.setAttribute('aria-label', 'Sottolivello ' + s + ' con ' + n + (n === 1 ? ' elettrone' : ' elettroni'));
    b.onclick = () => { scelta.sub = s; scelta.m = 0; aggiornaOrbitali(); };
    b.dataset.s = s;
    box.appendChild(b);
  }
  aggiornaOrbitali(true);
}
function aggiornaOrbitali(soloInterfaccia) {
  for (const b of $('sottolivelli').children) b.setAttribute('aria-pressed', String(b.dataset.s === scelta.sub));
  const l = scelta.sub[1];
  const m = $('orbitali-m');
  m.innerHTML = '';
  if (l !== 's') {
    NOMI_M[l].forEach((nome, i) => {
      const b = document.createElement('button');
      b.textContent = nome.replace(/^([pdf])/, scelta.sub[0] + '$1');
      b.setAttribute('aria-pressed', String(i === scelta.m));
      b.onclick = () => { scelta.m = i; aggiornaOrbitali(); };
      m.appendChild(b);
    });
  }
  visore.orbitale(+scelta.sub[0], 'spdf'.indexOf(l), scelta.m);
  if (!soloInterfaccia) aggiornaDidascalia();
}
function aggiornaDidascalia() {
  const e = corrente; if (!e) return;
  let t;
  if (vistaCorrente === 'atomo') {
    t = 'Modello a gusci: ' + e.gusci.length + (e.gusci.length === 1 ? ' guscio' : ' gusci') + ' attorno al nucleo. È una semplificazione: gli elettroni non girano su orbite, ma occupano orbitali (guarda la vista Orbitali). Trascina per ruotare.';
  } else if (vistaCorrente === 'nucleo') {
    t = 'Nucleo di ' + e.n.toLowerCase() + '-' + e.A + ': ' + e.z + (e.z === 1 ? ' protone' : ' protoni') + ' (rossi) e ' + e.N + (e.N === 1 ? ' neutrone' : ' neutroni') + ' (grigi). In scala reale il nucleo è circa centomila volte più piccolo dell\'atomo.';
  } else {
    const n = (e.sub.find((x) => x[0] === scelta.sub) || [0, 0])[1];
    const l = scelta.sub[1];
    const quanti = {s: 1, p: 3, d: 5, f: 7}[l];
    const nome = l === 's' ? scelta.sub : NOMI_M[l][scelta.m].replace(/^([pdf])/, scelta.sub[0] + '$1');
    t = 'Orbitale ' + nome + '. Il sottolivello ' + scelta.sub + ' ha ' + quanti + (quanti === 1 ? ' orbitale' : ' orbitali') + ' e qui contiene ' + n + (n === 1 ? ' elettrone' : ' elettroni') +
      '. La nuvola mostra dove è probabile trovare l\'elettrone; i due colori indicano zone in cui la funzione d\'onda ha segno opposto. Forma calcolata con il modello dell\'atomo di idrogeno.';
  }
  $('didascalia').textContent = t;
}

/* ---------- visore 3D ---------- */
const visore = (() => {
  const cv = $('visore');
  const ctx = cv.getContext('2d');
  let W = 0, dpr = 1;
  let el = null, modo = 'atomo';
  let yaw = 0.6, pitch = -0.35, auto = !MENO_MOTO;
  let t0 = performance.now(), tempo = 0, animando = false, visibile = true;
  let nucleoni = [], nubi = [];

  function dimensiona() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cv.clientWidth || 360;
    if (w * dpr !== cv.width) { cv.width = cv.height = Math.round(w * dpr); }
    W = cv.width;
  }

  // sfere ombreggiate prerenderizzate (una per colore)
  const sprite = {};
  function sfera(col) {
    if (sprite[col]) return sprite[col];
    const s = document.createElement('canvas'); s.width = s.height = 96;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(34, 32, 4, 48, 48, 48);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.85, ombra(col, 0.55)); gr.addColorStop(1, ombra(col, 0.35));
    g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 47, 0, 7); g.fill();
    return (sprite[col] = s);
  }
  function ombra(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) * f, gg = ((n >> 8) & 255) * f, b = (n & 255) * f;
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
  }
  const C = { p: '#FF6B57', n: '#B9C5D6', e: '#FFD166', neg: '#6FB7FF' };

  // generatore pseudo-casuale riproducibile
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // nucleo: protoni e neutroni come sfere di diametro 1, compattate in una palla per rilassamento
  let fattoreSfera = 1;
  function preparaNucleo(e) {
    const A = e.A, r = rng(e.z * 7919 + A);
    const tipi = Array(A).fill('n'); for (let i = 0; i < e.z; i++) tipi[i] = 'p';
    for (let i = A - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tipi[i], tipi[j]] = [tipi[j], tipi[i]]; }
    const P = new Float64Array(3 * A), Rb = 0.75 * Math.cbrt(A);
    for (let i = 0; i < A; i++) {
      let x, y, z; do { x = 2 * r() - 1; y = 2 * r() - 1; z = 2 * r() - 1; } while (x * x + y * y + z * z > 1);
      P[3 * i] = x * Rb; P[3 * i + 1] = y * Rb; P[3 * i + 2] = z * Rb;
    }
    const D = 0.97;
    for (let it = 0; it < 70 && A > 1; it++) {
      for (let i = 0; i < 3 * A; i++) P[i] *= 0.975;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < A; i++) for (let j = i + 1; j < A; j++) {
          const dx = P[3 * j] - P[3 * i], dy = P[3 * j + 1] - P[3 * i + 1], dz = P[3 * j + 2] - P[3 * i + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < D * D) {
            const d = Math.sqrt(d2) || 1e-3, k = (D - d) / (2 * d);
            P[3 * i] -= dx * k; P[3 * i + 1] -= dy * k; P[3 * i + 2] -= dz * k;
            P[3 * j] += dx * k; P[3 * j + 1] += dy * k; P[3 * j + 2] += dz * k;
          }
        }
      }
    }
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < A; i++) { cx += P[3 * i]; cy += P[3 * i + 1]; cz += P[3 * i + 2]; }
    cx /= A; cy /= A; cz /= A;
    let rmax = 0;
    for (let i = 0; i < A; i++) rmax = Math.max(rmax, Math.hypot(P[3 * i] - cx, P[3 * i + 1] - cy, P[3 * i + 2] - cz));
    const norma = rmax + 0.5;
    fattoreSfera = 0.5 / norma;
    nucleoni = [];
    for (let i = 0; i < A; i++) nucleoni.push({ x: (P[3 * i] - cx) / norma, y: (P[3 * i + 1] - cy) / norma, z: (P[3 * i + 2] - cz) / norma, t: tipi[i] });
  }

  // assi dei gusci: ogni guscio ha un piano inclinato diverso
  function pianoGuscio(i) {
    const a = i * 2.2 + 0.4, b = 0.5 + 0.35 * Math.sin(i * 1.7);
    const nx = Math.sin(b) * Math.cos(a), ny = Math.cos(b), nz = Math.sin(b) * Math.sin(a);
    // due vettori ortonormali nel piano
    let ux = -nz, uy = 0, uz = nx; const lu = Math.hypot(ux, uy, uz) || 1; ux /= lu; uz /= lu;
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
    return { u: [ux, uy, uz], v: [vx, vy, vz] };
  }

  /* ----- orbitali (modello idrogenoide, Z = 1) ----- */
  function laguerre(k, a, x) {
    if (k === 0) return 1;
    let l0 = 1, l1 = 1 + a - x;
    for (let i = 1; i < k; i++) { const l2 = ((2 * i + 1 + a - x) * l1 - (i + a) * l0) / (i + 1); l0 = l1; l1 = l2; }
    return l1;
  }
  const radiale = (n, l, r) => { const rho = 2 * r / n; return Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho); };
  const ANG = [
    [() => 1],
    [(x) => x, (x, y) => y, (x, y, z) => z],
    [(x, y) => x * y, (x, y, z) => y * z, (x, y, z) => x * z, (x, y) => (x * x - y * y) / 2, (x, y, z) => (3 * z * z - 1) / (2 * Math.sqrt(3))],
    [(x, y, z) => z * (5 * z * z - 3), (x, y, z) => x * (5 * z * z - 1), (x, y, z) => y * (5 * z * z - 1), (x, y, z) => x * y * z,
      (x, y, z) => z * (x * x - y * y), (x, y) => x * (x * x - 3 * y * y), (x, y) => y * (3 * x * x - y * y)],
  ];
  let chiaveNube = '';
  function preparaOrbitale(n, l, m) {
    const key = n + '-' + l + '-' + m;
    if (key === chiaveNube) return;
    chiaveNube = key;
    const r = rng(n * 131 + l * 17 + m);
    const rmax = 4 * n * n + 12, M = 1400;
    const cum = new Float64Array(M + 1);
    for (let i = 1; i <= M; i++) { const rr = (i - 0.5) * rmax / M; const R = radiale(n, l, rr); cum[i] = cum[i - 1] + rr * rr * R * R; }
    const tot = cum[M];
    let r99 = rmax;
    for (let i = 1; i <= M; i++) if (cum[i] >= 0.92 * tot) { r99 = i * rmax / M; break; }  // nuvola che contiene il 92% della probabilita'
    const Y = ANG[l][m];
    let ymax = 0;
    for (let i = 0; i < 4000; i++) { const zz = 2 * r() - 1, ph = 6.2832 * r(), s = Math.sqrt(1 - zz * zz); const v = Y(s * Math.cos(ph), s * Math.sin(ph), zz); ymax = Math.max(ymax, v * v); }
    ymax *= 1.05;
    const N = 6000;
    nubi = [];
    let guard = 0;
    while (nubi.length < N && guard++ < N * 60) {
      const zz = 2 * r() - 1, ph = 6.2832 * r(), s = Math.sqrt(1 - zz * zz);
      const x = s * Math.cos(ph), y = s * Math.sin(ph);
      const v = Y(x, y, zz);
      if (r() * ymax > v * v) continue;
      // raggio dalla distribuzione radiale (inversione della cumulata)
      const u = r() * 0.92 * tot;
      let lo = 0, hi = M;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid; else hi = mid; }
      const rr = (lo + r()) * rmax / M;
      const segno = Math.sign(radiale(n, l, rr) * v) || 1;
      const k = rr / r99;
      nubi.push({ x: x * k, y: -zz * k, z: y * k, s: segno });
    }
  }

  /* ----- disegno ----- */
  function proietta(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const f = 3.2 / (3.2 - z2);
    return [x1 * f, y2 * f, z2, f];
  }

  let alone = '#E8C468';
  function sfondo() {
    const c = W / 2;
    ctx.clearRect(0, 0, W, W);
    const g = ctx.createRadialGradient(c, c, 0, c, c, W * 0.5);
    g.addColorStop(0, hexA(alone, modo === 'nucleo' ? 0.16 : 0.12)); g.addColorStop(0.55, hexA(alone, 0.04)); g.addColorStop(1, hexA(alone, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    ctx.save();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function disegnaNucleo(scala, R, cx, cy, dimSfera) {
    const pts = nucleoni.map((p) => { const q = proietta(p.x * scala, p.y * scala, p.z * scala); return [q[0] * R, q[1] * R, q[2] / (scala || 1), q[3], p.t]; });
    pts.sort((a, b) => a[2] - b[2]);
    for (const [x, y, z, f, t] of pts) {
      const r = dimSfera * f;
      ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, Math.max(0, (z + 1) / 2));
      ctx.drawImage(sfera(C[t]), cx + x - r, cy + y - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
  }

  function disegnaAtomo() {
    const c = W / 2, R = W * 0.43;
    const k = el.gusci.length;
    const raggi = el.gusci.map((_, i) => R * (0.24 + 0.76 * (i + 1) / k));
    const nucleoR = Math.max(W * 0.018, Math.min(W * 0.07, raggi[0] * 0.42));
    const dimSfera = nucleoR * fattoreSfera;
    const voci = [];
    el.gusci.forEach((ne, i) => {
      const { u, v } = pianoGuscio(i);
      const rad = raggi[i] / R;
      const P = (a) => [rad * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), rad * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), rad * (Math.cos(a) * u[2] + Math.sin(a) * v[2])];
      const S = 120;
      for (let s = 0; s < S; s++) {
        const a0 = s / S * 6.2832, a1 = (s + 1) / S * 6.2832;
        const p0 = proietta(...P(a0)), p1 = proietta(...P(a1));
        voci.push({ z: (p0[2] + p1[2]) / 2, tipo: 'l', a: p0, b: p1 });
      }
      const vel = (MENO_MOTO ? 0 : 0.9) / Math.pow(i + 1, 0.8);
      for (let j = 0; j < ne; j++) {
        const q = proietta(...P(j / ne * 6.2832 + tempo * vel + i * 0.7));
        voci.push({ z: q[2], tipo: 'e', p: q });
      }
    });
    voci.push({ z: 0, tipo: 'n' });
    voci.sort((a, b) => a.z - b.z);
    const er = Math.max(2.2 * dpr, W * 0.0105);
    for (const it of voci) {
      if (it.tipo === 'l') {
        const prof = (it.z + 1) / 2;
        ctx.strokeStyle = 'rgba(200,216,245,' + (0.1 + 0.3 * prof).toFixed(3) + ')';
        ctx.lineWidth = 1.1 * dpr;
        ctx.beginPath(); ctx.moveTo(c + it.a[0] * R, c + it.a[1] * R); ctx.lineTo(c + it.b[0] * R, c + it.b[1] * R); ctx.stroke();
      } else if (it.tipo === 'e') {
        const r = er * it.p[3];
        ctx.globalAlpha = 0.6 + 0.4 * (it.z + 1) / 2;
        ctx.drawImage(sfera(C.e), c + it.p[0] * R - r, c + it.p[1] * R - r, 2 * r, 2 * r);
        ctx.globalAlpha = 1;
      } else {
        const g = ctx.createRadialGradient(c, c, 0, c, c, nucleoR * 2.6);
        g.addColorStop(0, 'rgba(255,107,87,.3)'); g.addColorStop(1, 'rgba(255,107,87,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, nucleoR * 2.6, 0, 7); ctx.fill();
        disegnaNucleo(nucleoR / R, R, c, c, dimSfera);
      }
    }
  }

  function disegnaSoloNucleo() {
    const c = W / 2, R = W * 0.36;
    const dimSfera = R * fattoreSfera * (el.A <= 4 ? 0.8 : 1);
    disegnaNucleo(1, R, c, c, dimSfera);
  }

  function disegnaOrbitale() {
    const c = W / 2, R = W * 0.42;
    const pts = nubi.map((p) => { const q = proietta(p.x, p.y, p.z); return [q[0], q[1], q[2], p.s]; });
    pts.sort((a, b) => a[2] - b[2]);
    const r = Math.max(1, 1.1 * dpr);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, z, s] of pts) {
      ctx.globalAlpha = 0.16 + 0.34 * (z + 1) / 2;
      ctx.fillStyle = s > 0 ? C.e : C.neg;
      ctx.beginPath(); ctx.arc(c + x * R, c + y * R, r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // nucleo e assi
    ctx.strokeStyle = 'rgba(190,210,225,.35)'; ctx.lineWidth = 1 * dpr;
    for (const [ax, ay, az, nome] of [[1, 0, 0, 'x'], [0, 0, 1, 'y'], [0, -1, 0, 'z']]) {
      const a = proietta(-ax * 1.05, -ay * 1.05, -az * 1.05), b = proietta(ax * 1.05, ay * 1.05, az * 1.05);
      ctx.beginPath(); ctx.moveTo(c + a[0] * R, c + a[1] * R); ctx.lineTo(c + b[0] * R, c + b[1] * R); ctx.stroke();
      ctx.fillStyle = 'rgba(190,210,225,.7)'; ctx.font = (11 * dpr) + 'px "DM Sans",sans-serif';
      ctx.fillText(nome, c + b[0] * R + 4 * dpr, c + b[1] * R + 4 * dpr);
    }
    ctx.fillStyle = C.p; ctx.beginPath(); ctx.arc(c, c, 2.4 * dpr, 0, 7); ctx.fill();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (!trascina.attivo && auto && modo !== 'orbitali') yaw += dt * 0.25;
    tempo += dt;
    dimensiona();
    sfondo();
    if (el) {
      if (modo === 'atomo') disegnaAtomo();
      else if (modo === 'nucleo') disegnaSoloNucleo();
      else disegnaOrbitale();
    }
    ctx.restore();
    // gli orbitali sono fermi: si ridisegna solo mentre li si trascina
    const serve = trascina.attivo || (modo !== 'orbitali' && !MENO_MOTO);
    if (animando && serve && visibile && !document.hidden) requestAnimationFrame(frame); else animando = false;
  }
  function avvia() { if (!animando) { animando = true; t0 = performance.now(); requestAnimationFrame(frame); } }

  // per gli orbitali: asse x verso destra, z in alto, y che si allontana; rotazione automatica ferma
  // gli orbitali che stanno nel piano xy si guardano dall'alto, quelli lungo y un po' di lato
  let ultimo = [0, 0];
  function orienta() {
    const [l, m] = ultimo;
    const piano = (l === 2 && (m === 0 || m === 3)) || (l === 3 && (m === 5 || m === 6));
    const lungoY = (l === 1 && m === 1) || (l === 2 && m === 1) || (l === 3 && m === 2);
    yaw = lungoY ? -1.05 : -0.42; pitch = piano ? -1.05 : -0.3;
  }
  const trascina = { attivo: false, x: 0, y: 0 };
  cv.addEventListener('pointerdown', (ev) => { trascina.attivo = true; trascina.x = ev.clientX; trascina.y = ev.clientY; try { cv.setPointerCapture(ev.pointerId); } catch (_) {} cv.style.cursor = 'grabbing'; avvia(); });
  cv.addEventListener('pointermove', (ev) => {
    if (!trascina.attivo) return;
    yaw += (ev.clientX - trascina.x) * 0.01; pitch += (ev.clientY - trascina.y) * 0.01;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
    trascina.x = ev.clientX; trascina.y = ev.clientY;
    avvia();
  });
  const fine = () => { trascina.attivo = false; cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (visibile && el) avvia(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && el) avvia(); });
  addEventListener('resize', () => { if (el) avvia(); });

  return {
    carica(e) {
      el = e;
      alone = getComputedStyle(document.documentElement).getPropertyValue(VAR_COLORE[e.cat]).trim() || alone;
      preparaNucleo(e); avvia();
    },
    vista(v) { modo = v; if (v === 'orbitali') orienta(); avvia(); },
    orbitale(n, l, m) { ultimo = [l, m]; preparaOrbitale(n, l, m); if (modo === 'orbitali') { orienta(); avvia(); } },
    ferma() { el = null; animando = false; },
  };
})();

/* ---------- materiali ---------- */
const CATEGORIE = MATERIALI_DATI.categorie;
const MATERIALI = MATERIALI_DATI.materiali;
const PER_ID = Object.fromEntries(MATERIALI.map((m) => [m.id, m]));
const ORDINE_MAT = CATEGORIE.flatMap(([c]) => MATERIALI.filter((m) => m.cat === c));
const NOME_CAT = Object.fromEntries(CATEGORIE);
const NEI_MAT = {};
for (const m of ORDINE_MAT) for (const [z] of m.comp) (NEI_MAT[z] = NEI_MAT[z] || []).push(m);

function formulaHTML(f) {
  let carica = '';
  const q = f.match(/([+-])$/);
  if (q) { carica = '<sup>' + q[1].replace('-', '−') + '</sup>'; f = f.slice(0, -1); }
  return f.split('·').map((parte) => {
    const mm = parte.match(/^(\d+)(.*)$/);
    const corpo = mm ? mm[2] : parte;
    return (mm ? mm[1] : '') + corpo.replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
  }).join('·') + carica;
}
function cpk(z) {
  const h = (ELEMENTI[z - 1].cpk || 'B0B0B0').padStart(6, '0');
  return '#' + h;
}
// versione schiarita per i colori troppo scuri sul fondo blu notte
function cpkChiaro(z) {
  const n = parseInt(cpk(z).slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum < 0.45) { const k = (0.45 - lum) * 1.4; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function puntini(m) {
  return m.comp.slice().sort((a, b) => a[0] - b[0]).map(([z]) => '<i style="background:' + cpkChiaro(z) + '" title="' + ELEMENTI[z - 1].n + '"></i>').join('');
}
function rigaMateriale(m) {
  return '<li><button class="riga-mat" data-id="' + m.id + '"><span class="rf">' + formulaHTML(m.f) + '</span><span class="rn">' + pedici(m.n) +
    '</span><span class="rp" aria-hidden="true">' + puntini(m) + '</span></button></li>';
}

let catAttiva = null;
function costruisciCategorie() {
  const box = $('categorie');
  const voci = [[null, 'Tutti']].concat(CATEGORIE);
  box.innerHTML = voci.map(([c, nome]) => '<button data-cat="' + (c || '') + '" aria-pressed="' + (c === null) + '">' + nome + '</button>').join('');
  box.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    catAttiva = b.dataset.cat || null;
    for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
    mostraListaMateriali();
  };
}
function mostraListaMateriali() {
  const q = normalizza($('cerca').value);
  const qf = q.replace(/\s/g, '');
  const corrisponde = (m) => !q || normalizza(m.n).includes(q) || normalizza(m.f.replace('·', '')).startsWith(qf) || normalizza(m.d).includes(q) && q.length > 3;
  let html = '', tot = 0;
  for (const [c, nome] of CATEGORIE) {
    if (catAttiva && c !== catAttiva) continue;
    const voci = ORDINE_MAT.filter((m) => m.cat === c && corrisponde(m));
    if (!voci.length) continue;
    tot += voci.length;
    html += '<h2>' + nome + '</h2><ul>' + voci.map(rigaMateriale).join('') + '</ul>';
  }
  $('lista-materiali').innerHTML = tot ? html : '<p class="vuoto-mat">Nessun materiale corrisponde a «' + $('cerca').value.replace(/[<&]/g, '') + '».</p>';
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.riga-mat[data-id]');
  if (b) location.hash = '#/m/' + b.dataset.id;
});

function articoloDet(nome) {
  const n = nome.toLowerCase();
  if (/^[aeiouh]/.test(n)) return "l'" + n;
  if (/^(s[^aeiou]|z|x|gn|ps|pn|y)/.test(n)) return 'lo ' + n;
  return 'il ' + n;
}
function mostraNeiMateriali(e) {
  const lista = NEI_MAT[e.z] || [];
  const nome = articoloDet(e.n);
  const box = $('nei-materiali');
  if (!lista.length) {
    box.innerHTML = '<p class="isotopo" style="margin:0">Nessuno dei ' + MATERIALI.length + ' materiali dell\'Atlante contiene ' + nome + '.</p>';
    return;
  }
  const Nome = nome.charAt(0).toUpperCase() + nome.slice(1);
  box.innerHTML = '<details class="nei-materiali"><summary>' + Nome + ' è in ' + lista.length + (lista.length === 1 ? ' materiale' : ' materiali') +
    ' dell\'Atlante</summary><ul class="lista-mat">' + lista.map(rigaMateriale).join('') + '</ul></details>';
}

let materialeCorrente = null;
function mostraMateriale(m) {
  materialeCorrente = m;
  document.title = m.n + ' · Atlante della materia';
  const i = ORDINE_MAT.indexOf(m);
  const prec = ORDINE_MAT[i - 1], succ = ORDINE_MAT[i + 1];
  $('prec-mat').hidden = !prec; $('succ-mat').hidden = !succ;
  if (prec) { $('prec-mat').setAttribute('aria-label', 'Materiale precedente: ' + prec.n); $('prec-mat').onclick = () => { location.hash = '#/m/' + prec.id; }; }
  if (succ) { $('succ-mat').setAttribute('aria-label', 'Materiale successivo: ' + succ.n); $('succ-mat').onclick = () => { location.hash = '#/m/' + succ.id; }; }
  $('mat-categoria').textContent = NOME_CAT[m.cat];
  $('mat-formula').innerHTML = formulaHTML(m.f);
  $('mat-nome').innerHTML = pedici(m.n);
  const unita = m.tipo === 'cristallo' || m.q ? 'massa della formula' : 'massa molare';
  const stato = m.st === 'in soluzione' ? 'Esiste in soluzione' : m.st.charAt(0).toUpperCase() + m.st.slice(1) + ' a temperatura ambiente';
  $('mat-meta').textContent = stato + ', ' + unita + ' ' + numero(m.mm, 2) + ' g/mol';
  const contatori = {};
  for (const z of m.a) contatori[z] = (contatori[z] || 0) + 1;
  $('mat-legenda').innerHTML = Object.keys(contatori).map(Number).sort((a, b) => a - b)
    .map((z) => '<span><i style="background:' + cpkChiaro(z) + '"></i>' + ELEMENTI[z - 1].n + '</span>').join('');
  const unitaComp = m.tipo === 'cristallo' || m.q ? "nell'unità di formula" : 'nella molecola';
  $('mat-composizione').innerHTML = m.comp.map(([z, n, perc]) => {
    const e = ELEMENTI[z - 1];
    return '<li><a href="#/' + z + '"><span class="cs" style="--c:' + cpkChiaro(z) + '">' + e.s + '</span><span class="cn">' + e.n +
      '<small>' + n + (n === 1 ? ' atomo ' : ' atomi ') + unitaComp + '</small></span><span class="cp">' + numero(perc, 1) + '%</span>' +
      '<span class="barra-perc"><b style="width:' + perc + '%;--k:' + cpkChiaro(z) + '"></b></span></a></li>';
  }).join('');
  $('mat-comp-nota').textContent = 'Le percentuali sono in massa: quanto pesa ogni elemento sul totale. Tocca un elemento per aprire la sua scheda.';
  $('mat-descr').innerHTML = pedici(m.d);
  $('mat-usi').innerHTML = pedici(m.u);
  let didascalia;
  if (m.tipo === 'cristallo') {
    didascalia = 'Un frammento del reticolo cristallino. Nel cristallo vero questa disposizione si ripete miliardi di volte in tutte le direzioni. Trascina per ruotare.';
    $('mat-fonte-3d').textContent = 'Modello 3D: costruito dalla struttura del cristallo e dalla sua costante di reticolo sperimentale.';
  } else {
    const ioni = m.b.length === 0 || (m.q && m.q.some((x) => x));
    didascalia = 'Modello a sfere e bastoncini: le distanze tra gli atomi sono in scala, le sfere sono più piccole del vero per mostrare i legami.' +
      (ioni ? ' Gli ioni sono mostrati vicini ma separati: nel solido vero formano un reticolo cristallino.' : '') + ' Trascina per ruotare.';
    $('mat-fonte-3d').textContent = 'Modello 3D: calcolato dalla formula di struttura con lunghezze e angoli di legame standard. Il metodo è stato verificato su 642 molecole con struttura 3D pubblicata (database FreeSolv): lo scarto medio delle lunghezze di legame è di 0,01 Å.';
  }
  $('mat-didascalia').textContent = didascalia;
  const simboli = m.a.length <= 24 && m.tipo !== 'cristallo';
  visoreMat.carica(m, simboli);
  etichettaSimboli(simboli);
}
function etichettaSimboli(on) {
  $('mat-simboli').setAttribute('aria-pressed', String(on));
  $('mat-simboli').textContent = on ? 'Nascondi i simboli' : 'Mostra i simboli';
}
$('torna-mat').onclick = () => { location.hash = '#/materiali'; };
$('mat-simboli').onclick = () => {
  const on = $('mat-simboli').getAttribute('aria-pressed') !== 'true';
  etichettaSimboli(on);
  visoreMat.simboli(on);
};

/* visore a sfere e bastoncini */
const RAGGIO_COV = { 1: .31, 3: 1.28, 5: .84, 6: .76, 7: .71, 8: .66, 9: .57, 11: 1.66, 12: 1.41, 13: 1.21, 14: 1.11, 15: 1.07, 16: 1.05, 17: 1.02,
  19: 2.03, 20: 1.76, 22: 1.6, 25: 1.39, 26: 1.32, 29: 1.32, 30: 1.22, 35: 1.2, 47: 1.45, 53: 1.39, 54: 1.4, 55: 2.44, 78: 1.36, 80: 1.32, 82: 1.46 };
const RAGGIO_IONICO = { 3: .76, 11: 1.02, 12: .72, 19: 1.38, 20: 1.0, 30: .74, 47: 1.15, 55: 1.67, 82: 1.19, 8: 1.4, 9: 1.33, 16: 1.84, 17: 1.81, 35: 1.96 };
const visoreMat = (() => {
  const cv = $('visore-mat');
  const ctx = cv.getContext('2d');
  let W = 0, dpr = 1, yaw = 0.6, pitch = -0.35, t0 = 0, animando = false, visibile = true, mostraSimboli = false;
  let atomi = [], legami = [], estensione = 1, ionico = false, cristallo = false;
  const sprite = {};
  function sfera(col) {
    if (sprite[col]) return sprite[col];
    const s = document.createElement('canvas'); s.width = s.height = 96;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(34, 32, 4, 48, 48, 48);
    const n = parseInt(col.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const sc = (f) => 'rgb(' + (r * f | 0) + ',' + (gg * f | 0) + ',' + (b * f | 0) + ')';
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, col); gr.addColorStop(0.85, sc(0.55)); gr.addColorStop(1, sc(0.35));
    g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 47, 0, 7); g.fill();
    return (sprite[col] = s);
  }
  function carica(m, simboli) {
    cristallo = m.tipo === 'cristallo';
    ionico = cristallo && m.comp.some(([z]) => [3, 11, 12, 19, 20, 30, 47, 55, 82].includes(z));
    mostraSimboli = simboli;
    atomi = m.a.map((z, i) => {
      const r = ionico ? 0.42 * (RAGGIO_IONICO[z] || 1.2) : 0.22 + 0.22 * (RAGGIO_COV[z] || 1.3);
      return { z, x: m.x[3 * i], y: -m.x[3 * i + 1], zz: m.x[3 * i + 2], r, col: cpk(z), s: ELEMENTI[z - 1].s };
    });
    legami = m.b.map(([i, j, o]) => ({ i, j, o: cristallo ? 1 : o }));
    // le molecole piccole non vengono ingrandite troppo: la scala resta confrontabile tra una scheda e l'altra
    estensione = Math.max(2.0, ...atomi.map((a) => Math.hypot(a.x, a.y, a.zz) + a.r));
    yaw = 0.6; pitch = -0.35;
    avvia();
  }
  function proietta(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const f = 4 / (4 - z2 / estensione);
    return [x1 * f, y2 * f, z2, f];
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (!trascina.attivo && !MENO_MOTO) yaw += dt * 0.3;
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cv.clientWidth || 360;
    if (Math.round(w * dpr) !== cv.width) cv.width = cv.height = Math.round(w * dpr);
    W = cv.width;
    const c = W / 2, S = W * 0.45 / estensione;
    ctx.clearRect(0, 0, W, W);
    const g = ctx.createRadialGradient(c, c, 0, c, c, W * 0.5);
    g.addColorStop(0, 'rgba(140,170,255,.10)'); g.addColorStop(1, 'rgba(140,170,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    const P = atomi.map((a) => proietta(a.x, a.zz, a.y));
    const voci = [];
    for (let k = 0; k < atomi.length; k++) voci.push({ t: 'a', k, z: P[k][2] });
    for (const l of legami) {
      const zm = (P[l.i][2] + P[l.j][2]) / 2;
      voci.push({ t: 'l', l, da: l.i, z: (P[l.i][2] + zm) / 2 - 0.001 });
      voci.push({ t: 'l', l, da: l.j, z: (P[l.j][2] + zm) / 2 - 0.001 });
    }
    voci.sort((a, b) => a.z - b.z);
    const prof = (z) => 0.55 + 0.45 * Math.min(1, Math.max(0, (z / estensione + 1) / 2));
    for (const v of voci) {
      if (v.t === 'a') {
        const a = atomi[v.k], p = P[v.k];
        const r = a.r * S * p[3];
        ctx.globalAlpha = prof(p[2]);
        ctx.drawImage(sfera(a.col), c + p[0] * S - r, c + p[1] * S - r, 2 * r, 2 * r);
        if (mostraSimboli && r > 7 * dpr) {
          const n = parseInt(a.col.slice(1), 16);
          const lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
          ctx.fillStyle = lum > 0.55 ? 'rgba(12,22,38,.85)' : 'rgba(255,255,255,.92)';
          ctx.font = '500 ' + Math.round(r * 0.9) + 'px "DM Sans",sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(a.s, c + p[0] * S, c + p[1] * S + r * 0.05);
        }
        ctx.globalAlpha = 1;
      } else {
        const { l, da } = v;
        const altro = da === l.i ? l.j : l.i;
        const p = P[da], q = P[altro];
        const x0 = c + p[0] * S, y0 = c + p[1] * S;
        const xm = c + (p[0] + q[0]) / 2 * S, ym = c + (p[1] + q[1]) / 2 * S;
        const dx = xm - x0, dy = ym - y0, L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        ctx.globalAlpha = prof(v.z);
        if (ionico) {
          ctx.strokeStyle = 'rgba(200,216,245,.35)'; ctx.lineWidth = 1.2 * dpr; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xm, ym); ctx.stroke();
        } else {
          const base = 0.11 * S * p[3];
          const col = atomi[da].col;
          const linee = l.o === 3 ? [-1, 0, 1] : l.o === 2 ? [-0.6, 0.6] : l.o === 1.5 ? [-0.6, 0.6] : [0];
          const spessore = l.o === 1 ? base : base * 0.62;
          linee.forEach((k, idx) => {
            ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, spessore); ctx.lineCap = 'round';
            ctx.setLineDash(l.o === 1.5 && idx === 1 ? [spessore * 1.2, spessore * 1.4] : []);
            const off = k * base * 1.15;
            ctx.beginPath(); ctx.moveTo(x0 + nx * off, y0 + ny * off); ctx.lineTo(xm + nx * off, ym + ny * off); ctx.stroke();
          });
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      }
    }
    const serve = trascina.attivo || !MENO_MOTO;
    if (animando && serve && visibile && !document.hidden) requestAnimationFrame(frame); else animando = false;
  }
  function avvia() { if (!animando) { animando = true; t0 = performance.now(); requestAnimationFrame(frame); } }
  const trascina = { attivo: false, x: 0, y: 0 };
  cv.addEventListener('pointerdown', (ev) => { trascina.attivo = true; trascina.x = ev.clientX; trascina.y = ev.clientY; try { cv.setPointerCapture(ev.pointerId); } catch (_) {} avvia(); });
  cv.addEventListener('pointermove', (ev) => {
    if (!trascina.attivo) return;
    yaw += (ev.clientX - trascina.x) * 0.01; pitch = Math.max(-1.5, Math.min(1.5, pitch + (ev.clientY - trascina.y) * 0.01));
    trascina.x = ev.clientX; trascina.y = ev.clientY; avvia();
  });
  const fine = () => { trascina.attivo = false; };
  cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);
  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (visibile && atomi.length) avvia(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && atomi.length) avvia(); });
  return {
    carica,
    simboli(on) { mostraSimboli = on; avvia(); },
    ferma() { animando = false; },
  };
})();

/* ---------- installazione e uso offline ---------- */
let richiestaInstall = null;
addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); richiestaInstall = ev; $('installa').hidden = false; });
$('installa').onclick = async () => { if (!richiestaInstall) return; richiestaInstall.prompt(); await richiestaInstall.userChoice; richiestaInstall = null; $('installa').hidden = true; };
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone) $('installa-ios').hidden = false;
if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|anthropic/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

costruisciTavola();
costruisciLegenda();
costruisciCategorie();
instrada();
