// Gedeelde basis: hulpfuncties, API, navigatie tussen modules/tabbladen en het opstarten.
// Elk tabblad (static/<module>/<tabblad>.js) meldt zich aan met tabblad(id, {...}).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', {day:'numeric', month:'short', year:'numeric'}) : '';
const fmtNum = (n, dec = 1) => n == null ? '' : Number(n).toLocaleString('nl-NL', {maximumFractionDigits: dec});
// tijdstempels zonder offset (vóór 0.4.0) zijn UTC
const fmtStamp = s => s ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toLocaleString('nl-NL',
  {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '';
const fmtDur = m => m == null ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} u` + (m % 60 ? ` ${m % 60} min` : '');
const durInput = m => m == null ? '' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const nlNum = n => n == null ? '' : String(n).replace('.', ',');
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const json = (method, body) => ({method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});

let CFG = {categories: []}, TAB = null;

// Stuurt de sessie mee (inloggen.js). Uitgelogd bij een wijziging: inlogscherm, daarna hetzelfde verzoek opnieuw.
async function api(path, opts = {}, opnieuw = true) {
  const headers = {...(opts.headers || {})};
  if (SESSIE.token) headers['X-Sessie'] = SESSIE.token;
  const r = await fetch(path, {...opts, headers});
  sessieRest(r.headers.get('X-Sessie-Rest'));
  if (r.status === 401 && opnieuw) {
    let uit = null;
    try { uit = await r.clone().json(); } catch (_) {}
    if (uit?.inloggen) {
      await sessieLaden();
      if (!SESSIE.gebruiker) await inloggen('Je bent uitgelogd. Log opnieuw in; daarna wordt je wijziging opgeslagen.');
      return api(path, opts, false);
    }
  }
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).error || msg; } catch (_) {}
    throw new Error(msg || 'Er ging iets mis');
  }
  return (r.headers.get('content-type') || '').includes('json') ? r.json() : r.text();
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function fillSelect(sel, items, first) {
  sel.innerHTML = (first ? `<option value="">${esc(first)}</option>` : '') +
    items.map(i => `<option value="${esc(i.value ?? i)}">${esc(i.label ?? i)}</option>`).join('');
}

// Alle keuzelijsten met data-categorieen="<eerste optie>" vullen met de categorieën, gegroepeerd per systeem
// (keuze blijft staan). Met data-systemen komt per systeem ook een keuze "systeem:<id>" (alle categorieën ervan).
function vulCategorieKeuzes() {
  const systemen = CFG.systemen || [], inSys = new Set(systemen.flatMap(s => s.categorieen));
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const los = CFG.categories.filter(c => !inSys.has(c));
  $$('select[data-categorieen]').forEach(sel => {
    const keep = sel.value, metSys = sel.hasAttribute('data-systemen');
    const groepen = systemen.filter(s => s.categorieen.length || metSys);
    sel.innerHTML = opt('', sel.dataset.categorieen) +
      groepen.map(s => `<optgroup label="${esc(s.naam)}">${metSys ? opt('systeem:' + s.id, s.naam + ' – alles') : ''}` +
        s.categorieen.map(c => opt(c, c)).join('') + '</optgroup>').join('') +
      (groepen.length && los.length ? `<optgroup label="Zonder systeem">${los.map(c => opt(c, c)).join('')}</optgroup>`
        : los.map(c => opt(c, c)).join(''));
    sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
  });
}

// categorie met haar systeem ervoor, bijv. "Koelwater › Impeller" (zonder systeem: alleen de categorie)
const catLabel = cat => {
  const s = cat && (CFG.systemen || []).find(x => x.categorieen.includes(cat));
  return s ? `${s.naam} › ${cat}` : cat;
};

// ---------------------------------------------------------------- berichten tussen tabbladen
const LUISTERAARS = {};
const op = (naam, fn) => (LUISTERAARS[naam] ??= []).push(fn);
const meld = (naam, ...args) => (LUISTERAARS[naam] || []).forEach(fn => fn(...args));

// ---------------------------------------------------------------- tabbladen
// tabblad(id, {nieuw, toon, config, laden, ververs, naVerversen}):
//   nieuw()       – actie van de +-knop (zonder: geen +-knop)
//   toon(pad)     – bij openen van het tabblad; pad = rest van de hash (zie show), meestal []
//   config(CFG)   – na het laden van de instellingen
//   laden()       – bij het opstarten
//   ververs()     – na een wijziging ergens in de app; naVerversen() daarna (als alle lijsten bijgewerkt zijn)
const TABBLADEN = {};
const tabblad = (id, def) => { TABBLADEN[id] = def; };
const alle = (hook, ...args) => Promise.all(Object.values(TABBLADEN).map(t => t[hook]?.(...args)));

async function verversAlles() {
  await alle('ververs');
  await alle('naVerversen');
}

// rood getal bij een tabblad; de knop van de module toont het totaal van haar tabbladen
function zetTeller(tab, n) {
  const sec = $('#view-' + tab);
  const knop = $(`.tab[data-tab="${tab}"] .count`) || $(`.mod[data-mod="${tab}"] .count`);
  knop.hidden = !n; knop.textContent = n || '';
  sec.dataset.teller = n || 0;
  const nav = $(`.tab[data-tab="${tab}"]`)?.closest('nav');
  if (nav) {
    const som = $$('.tab', nav).reduce((s, b) => s + (+$('#view-' + b.dataset.tab).dataset.teller || 0), 0);
    const m = $(`.mod[data-mod="${nav.dataset.mod}"] .count`);
    m.hidden = !som; m.textContent = som || '';
  }
}

// ---------------------------------------------------------------- navigatie
// Elke module heeft een <nav class="tabs" data-mod> met haar tabbladen (bij één tabblad met data-enkel, niet getoond).
const tabsVan = mod => $$(`nav.tabs[data-mod="${mod}"] .tab`).map(b => b.dataset.tab);
// show(mod, tab, ...pad): pad gaat naar toon(pad) van het tabblad, bijv. #onderhoud/cats/cat/3 → toon(['cat', '3']).
// ga(...) doet hetzelfde als nieuwe stap in de geschiedenis, zodat de terugknop van browser/telefoon terug gaat.
const LAATSTE = {};
function ga(mod, tab, ...pad) {
  const hash = '#' + [mod, tab, ...pad].join('/');
  if (location.hash !== hash) history.pushState(null, '', hash);
  show(mod, tab, ...pad);
}
window.addEventListener('popstate', () => show(...location.hash.slice(1).split('/')));
function show(mod, tab, ...pad) {
  const eigen = $(`.tab[data-tab="${tab}"]`)?.closest('nav').dataset.mod;   // oude links, bijv. #logboek/tasks
  if (eigen) mod = eigen;
  if (!$(`.mod[data-mod="${mod}"]`)) mod = $('.mod').dataset.mod;
  const tabs = tabsVan(mod);
  if (!tabs.includes(tab)) tab = LAATSTE[mod] || tabs[0];
  LAATSTE[mod] = TAB = tab;
  $$('.mod').forEach(x => x.classList.toggle('active', x.dataset.mod === mod));
  $$('nav.tabs').forEach(n => n.hidden = n.dataset.mod !== mod || n.hasAttribute('data-enkel'));
  $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  $$('main > section').forEach(s => s.hidden = s.id !== 'view-' + tab);
  $('#fab').hidden = !TABBLADEN[tab]?.nieuw;
  pad = pad.filter(Boolean);
  TABBLADEN[tab]?.toon?.(pad);
  history.replaceState(null, '', '#' + mod + (tabs.length > 1 || pad.length ? '/' + tab : '') + pad.map(p => '/' + p).join(''));
}

// ---------------------------------------------------------------- opstarten
// standen van de urentellers (Instellingen) bovenin, bijv. "Hoofdmotor 1.234 u · Generator 56 u"
function toonUren() {
  const h = $('#hours'), uren = (CFG.uren || []).filter(u => u.waarde != null);
  h.hidden = !uren.length;
  h.textContent = uren.map(u => `${u.naam} ${fmtNum(u.waarde)} u`).join(' · ');
}

async function loadConfig() {
  CFG = await api('api/config');
  $('#title').textContent = CFG.title; document.title = CFG.title;
  toonUren();
  vulCategorieKeuzes();
  await alle('config', CFG);
}

async function start() {
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('.mod').forEach(b => b.addEventListener('click', () => show(b.dataset.mod)));
  $$('.tab').forEach(b => b.addEventListener('click', () => show(b.closest('nav').dataset.mod, b.dataset.tab)));
  $('#fab').addEventListener('click', () => TABBLADEN[TAB]?.nieuw?.());
  show(...location.hash.slice(1).split('/'));
  try {
    await sessieStart();
    await loadConfig();
    await alle('laden');
  } catch (e) { toast('Laden mislukt: ' + e.message); }
}
