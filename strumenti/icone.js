// Disegna le icone dell'app (lente con atomo) e le salva in PNG. Uso: node strumenti/icone.js
const { chromium } = require('playwright');
const path = require('path');
const svg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
<defs><radialGradient id="l" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#1B3358"/><stop offset=".65" stop-color="#0C1626"/></radialGradient><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF6B57" stop-opacity=".35"/><stop offset="1" stop-color="#FF6B57" stop-opacity="0"/></radialGradient>
<radialGradient id="p" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#FF6B57"/><stop offset="1" stop-color="#7a2a1c"/></radialGradient>
<radialGradient id="n" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#B9C5D6"/><stop offset="1" stop-color="#4f5c66"/></radialGradient>
<radialGradient id="e" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#FFD166"/><stop offset="1" stop-color="#8a6a12"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#l)"/>
<circle cx="50" cy="50" r="14" fill="url(#g)"/>
<g fill="none" stroke="#C8D8F5" stroke-opacity=".5" stroke-width="1">
<ellipse cx="50" cy="50" rx="29" ry="10.5" transform="rotate(-28 50 50)"/>
<ellipse cx="50" cy="50" rx="29" ry="10.5" transform="rotate(32 50 50)"/>
<ellipse cx="50" cy="50" rx="10.5" ry="29" transform="rotate(2 50 50)"/></g>
<circle cx="47.2" cy="48.6" r="3.6" fill="url(#n)"/><circle cx="52.6" cy="47.8" r="3.6" fill="url(#p)"/>
<circle cx="49.4" cy="53.2" r="3.6" fill="url(#p)"/><circle cx="53.6" cy="52.6" r="3.6" fill="url(#n)"/>
<circle cx="76.2" cy="36.8" r="3" fill="url(#e)"/><circle cx="26.5" cy="67" r="3" fill="url(#e)"/><circle cx="51" cy="21.3" r="3" fill="url(#e)"/>
</svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const p = await b.newPage();
  for (const s of [180, 192, 512]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<html><body style="margin:0">${svg(s)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'icone', `icona-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
