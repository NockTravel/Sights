/* ═══════════════════════════════════════
   SightCalc — shared.js
   Physics engine, theme switcher,
   burger menu, units, profiles base,
   URL sharing, display utils
═══════════════════════════════════════ */

/* ── Units ── */
let currentUnit = localStorage.getItem('sc_unit') || 'm';

function setUnit(u) {
  currentUnit = u;
  localStorage.setItem('sc_unit', u);
  document.querySelectorAll('.units-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === u));
  document.querySelectorAll('.unit-label').forEach(el => el.textContent = u === 'm' ? 'm' : 'yd');
  // Re-render table if results visible
  if (typeof renderTable === 'function' && document.getElementById('results')?.style.display !== 'none') renderTable();
}

function toUnit(metres) {
  return currentUnit === 'm' ? metres : Math.round(metres * 1.09361 * 10) / 10;
}

function fromUnit(val) {
  return currentUnit === 'm' ? val : val / 1.09361;
}

// Convert calibration distances to metres for physics (always work in metres internally)
function toMetres(val) {
  return currentUnit === 'm' ? val : val * 0.9144;
}

function unitLabel() { return currentUnit; }

/* ── Theme ── */
const THEMES = [
  {
    id: 'dark',
    name: 'Dark',
    desc: 'Default dark interface',
    swatch: { bg: '#0f0f0f', accent: '#5a90c8', text: '#e8e4dc', muted: '#888880' }
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    desc: 'Maximum readability outdoors',
    swatch: { bg: '#111111', accent: '#ffffff', text: '#ffffff', muted: '#aaaaaa' }
  },
  {
    id: 'dawn',
    name: 'Dawn',
    desc: 'Optimised for low-light shooting — warm red tones preserve night vision at dawn and dusk',
    swatch: { bg: '#0d0608', accent: '#c85040', text: '#f0ddd8', muted: '#906060' }
  },
  {
    id: 'light',
    name: 'Light',
    desc: 'Clean system UI — white surfaces, iOS/Android style',
    swatch: { bg: '#f2f2f7', accent: '#007aff', text: '#000000', muted: '#6e6e73' }
  },
  {
    id: 'paper',
    name: 'Paper',
    desc: 'Military field document — typewriter fonts, cream paper, ink aesthetic',
    swatch: { bg: '#f0ead6', accent: '#1a3d6b', text: '#1a1612', muted: '#8a7d65' }
  }
];

function removePaperHeader() {
  const header = document.querySelector('header');
  if (!header || !header.dataset.paperized) return;
  // Remove injected elements
  header.querySelectorAll('.paper-form-no, .paper-header-main, .paper-stamp-area').forEach(el => el.remove());
  delete header.dataset.paperized;
  // Remove sheet wrapper if present
  const sheet = document.querySelector('.sheet');
  if (sheet) {
    const inner = sheet.querySelector('.app, .tools-wrap, .ab-wrap, .foc-app');
    if (inner) sheet.parentNode.insertBefore(inner, sheet);
    sheet.remove();
  }
}

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('sc_theme', id);
  document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === id));
  if (id === 'paper') {
    const h = document.querySelector('header');
    if (h) delete h.dataset.paperized;
    applyPaperLayout();
  } else {
    removePaperHeader();
  }
}

function loadTheme() {
  const saved = localStorage.getItem('sc_theme') || 'dark';
  applyTheme(saved);
}

/* ── Burger menu ── */
function openSettings() {
  document.getElementById('settingsOverlay').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
}

function buildSettingsPanel() {
  const body = document.getElementById('settingsBody');
  if (!body) return;

  const savedTheme = localStorage.getItem('sc_theme') || 'dark';

  body.innerHTML = `
    <div>
      <div class="setting-group-title">Tools</div>
      <a href="workshop-tools.html" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--text);font-family:var(--mono);font-size:12px;margin-bottom:8px" onclick="closeSettings()">
        Workshop Tools
        <span style="color:var(--muted);font-size:14px">&#8250;</span>
      </a>
    </div>
    <div>
      <div class="setting-group-title">Units</div>
      <div class="units-toggle">
        <button class="units-btn${currentUnit==='m'?' active':''}" data-unit="m" onclick="setUnit('m')">Metres (m)</button>
        <button class="units-btn${currentUnit==='yd'?' active':''}" data-unit="yd" onclick="setUnit('yd')">Yards (yd)</button>
      </div>
    </div>
    <div>
      <div class="setting-group-title">Theme</div>
      <div class="theme-grid">
        ${THEMES.map(t => `
          <div class="theme-card${t.id===savedTheme?' active':''}" data-theme="${t.id}" onclick="applyTheme('${t.id}')" style="background:${t.swatch.bg};border:1px solid ${t.id===savedTheme?t.swatch.accent+'88':'transparent'}">
            <div style="height:28px;border-radius:4px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;background:${t.swatch.bg};border:1px solid ${t.swatch.accent}55;filter:brightness(${t.id==='light'?'0.94':'1.18'})">
              <span style="font-family:monospace;font-size:10px;color:${t.swatch.accent}">Aa</span>
            </div>
            <div style="font-family:monospace;font-size:11px;font-weight:500;color:${t.swatch.text};margin-bottom:2px">${t.name}</div>
            <div style="font-family:monospace;font-size:10px;color:${t.swatch.muted};line-height:1.4">${t.desc}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

/* ── Physics ── */
function trajectory(td, v0, la, sl, dr, am) {
  const dt = 0.002;
  let x=0, y=0, vx=v0*Math.cos(la), vy=v0*Math.sin(la), a=la;
  let ax=(-dr*Math.cos(a)/am)-9.8*Math.sin(sl), ay=(-dr*Math.sin(a)/am)-9.8*Math.cos(sl);
  while (x < td) {
    x += vx*dt + .5*ax*dt*dt; y += vy*dt + .5*ay*dt*dt;
    vx += ax*dt; vy += ay*dt; a = vy/vx;
    ax = (-dr*Math.cos(a)/am) - 9.8*Math.sin(sl);
    ay = (-dr*Math.sin(a)/am) - 9.8*Math.cos(sl);
  }
  return y - (x - td)*a;
}

function calcDrag(v, L, d, m) {
  const rho=1.204, Lm=L/1000, dm=d/1000, A=Math.PI*dm*Lm, Re=v*Lm/1.52e-5;
  return .5*rho*v*v*A*(0.0576/Math.pow(Re,.2)+0.0016*Lm/dm/Math.pow(Re,.4))*10/7;
}

function findAngle(dist, v0, drag, am, tol) {
  tol = tol || .001;
  let a=0, s=1, dp=trajectory(dist, v0, a*Math.PI/180, 0, drag, am);
  while (dp <= 0) { a += s; dp = trajectory(dist, v0, a*Math.PI/180, 0, drag, am); }
  let i=0;
  while (Math.abs(dp) > tol && i < 80) {
    s/=2; i++;
    while (dp > 0) { a -= s; dp = trajectory(dist, v0, a*Math.PI/180, 0, drag, am); }
    s/=2; i++;
    while (dp < 0) { a += s; dp = trajectory(dist, v0, a*Math.PI/180, 0, drag, am); }
  }
  return a;
}

function calcGap(v0, es, ea, d1, d2, dr, am) {
  const e1=findAngle(d1,v0,dr,am,.001), e2=findAngle(d2,v0,dr,am,.005);
  return (es*(Math.tan(e2*Math.PI/180)-Math.tan(e1*Math.PI/180))-ea*es*(d2-d1)/d1/d2)*1000;
}

function sMM(dist, v0, es, ea, dr, am) {
  const a = findAngle(dist, v0, dr, am, .001);
  return ((ea*(dist-es)/dist) - es*Math.tan(a*Math.PI/180))*1000;
}

/* ── Utilities ── */
function gi(id) { return parseFloat(document.getElementById(id).value); }

function toDisplay(tenths) {
  return (Math.round((tenths/10)*20)/20).toFixed(2);
}

/* ── Profile helpers (shared base) ── */
function confirmDelete(btn, name, deleteFn) {
  if (btn.dataset.confirming === 'true') {
    deleteFn(name);
  } else {
    btn.dataset.confirming = 'true';
    btn.textContent = 'confirm?';
    btn.style.background = 'var(--danger)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--danger)';
    btn.style.padding = '6px 8px';
    clearTimeout(btn._timer);
    btn._timer = setTimeout(() => {
      btn.dataset.confirming = 'false';
      btn.textContent = '\u2715';
      btn.style.background = '';
      btn.style.color = 'var(--danger)';
      btn.style.padding = '';
    }, 3000);
  }
}

/* ── URL sharing ── */
function copyURL(fields) {
  const p = new URLSearchParams();
  fields.forEach(id => { const el = document.getElementById(id); if (el) p.set(id, el.value); });
  const url = location.origin + location.pathname + '?' + p.toString();
  navigator.clipboard.writeText(url).catch(() => {});
  const b = document.getElementById('urlBar');
  if (b) { b.textContent = url; b.style.display = 'block'; }
}

function loadFromURL(fields) {
  const p = new URLSearchParams(location.search);
  let found = false;
  fields.forEach(id => { const v = p.get(id); if (v) { const el = document.getElementById(id); if (el) { el.value = v; found = true; } } });
  return found;
}

/* ── Export helpers ── */
function downloadBlob(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}

/* ── Page detection ── */
function detectPage() {
  return document.documentElement.getAttribute('data-page') || 'standard';
}

/* ── Paper header injection ── */
function injectPaperHeader() {
  const theme = localStorage.getItem('sc_theme') || 'dark';
  if (theme !== 'paper') return;
  const page = detectPage();
  const stampColours = {
    standard: '#1a3d6b',
    barebow: '#2d6b2d',
    experimental: '#b8860b',
    'workshop-tools': '#5a5a5a',
    'arrow-builder': '#5a5a5a',
    foc: '#5a5a5a'
  };
  // Also set as data attribute so CSS can target it
  document.documentElement.setAttribute('data-page', page);
  const col = stampColours[page] || '#1a3d6b';
  const pageLabels = {
    standard: 'Standard',
    barebow: 'Barebow',
    experimental: 'Experimental',
    'workshop-tools': 'Workshop',
    'arrow-builder': 'Arrow Builder',
    foc: 'FOC'
  };

  const header = document.querySelector('header');
  if (!header || header.dataset.paperized) return;
  header.dataset.paperized = '1';

  // Save original children
  const origChildren = Array.from(header.children);

  // Build paper header structure
  header.innerHTML = '';

  // Red vertical form number strip
  const formNo = document.createElement('div');
  formNo.className = 'paper-form-no';
  formNo.textContent = 'FORM SC-1   v0.3.0';
  header.appendChild(formNo);

  // Main title area
  const main = document.createElement('div');
  main.className = 'paper-header-main';
  main.innerHTML = `<div style="font-family:'Special Elite',monospace;font-size:28px;color:#f0ead6;letter-spacing:0.25em;text-transform:uppercase;line-height:1;margin-bottom:4px">SightCalc</div>
    <div style="font-family:'Courier Prime',monospace;font-size:11px;color:#b8aa90;letter-spacing:0.3em;text-transform:uppercase">Archery Sight Setting Calculator &mdash; ${pageLabels[page]}</div>`;
  header.appendChild(main);

  // Stamp area
  const stampArea = document.createElement('div');
  stampArea.className = 'paper-stamp-area';
  stampArea.innerHTML = `<svg class="paper-stamp-svg" width="160" height="60" viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-8deg);display:block;overflow:visible">
    <rect x="4" y="5" width="152" height="50" rx="4" fill="none" stroke="${col}" stroke-width="3"/>
    <rect x="9" y="10" width="142" height="40" rx="2" fill="none" stroke="${col}" stroke-width="1"/>
    <text x="80" y="38" text-anchor="middle" font-family="'Special Elite',monospace" font-size="20" fill="${col}" opacity="0.9">${pageLabels[page].toUpperCase()}</text>
  </svg>`;
  header.appendChild(stampArea);

  // Nav goes between main and stamp
  origChildren.forEach(el => {
    if (el.tagName === 'NAV') {
      header.insertBefore(el, stampArea);
    }
    if (el.classList && el.classList.contains('burger-btn')) {
      header.appendChild(el);
    }
  });

  // Wrap main content in sheet div if not already present
  const mainContent = document.querySelector('.app, .tools-wrap, .ab-wrap, .foc-app');
  if (mainContent && !mainContent.closest('.sheet')) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    mainContent.parentNode.insertBefore(sheet, mainContent);
    sheet.appendChild(mainContent);
  }
}

function applyPaperLayout() {
  const theme = localStorage.getItem('sc_theme') || 'dark';
  const body = document.body;
  if (theme === 'paper') {
    injectPaperHeader();
    // Wrap in sheet if needed
    const app = document.querySelector('.app');
    if (app && !app.closest('.sheet')) {
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      app.parentNode.insertBefore(sheet, app);
      sheet.appendChild(app);
    }
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  const page = detectPage();
  document.documentElement.setAttribute('data-page', page);
  loadTheme();
  buildSettingsPanel();
  applyPaperLayout();
  // Close overlay on background click
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeSettings(); });
});
