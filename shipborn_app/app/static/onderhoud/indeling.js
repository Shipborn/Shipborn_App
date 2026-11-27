// Onderhoud › Indeling: de vaste hoofdgroepen (Casco, Techniek, Interieur, Exterieur; CFG.groepen) met hun systemen.
// Overzicht = vier kaarten (+ "Zonder groep" als er systemen zonder groep zijn); tik → pagina van de groep
// (#onderhoud/indeling/groep/<id>) met de systemen als kaarten; tik op een systeem → systeempagina in Categorieën.
// Systemen krijgen hun groep hier of in Categorieën (✎ bij een systeem).
let indGroep = null;   // open groep (id, of '' = zonder groep), null = overzicht
const GROEP_ICOON = {casco: '🛥️', techniek: '⚙️', interieur: '🛋️', exterieur: '⚓'};

tabblad('indeling', {
  toon: pad => indToon(pad),
  config: () => TAB === 'indeling' ? indRender() : null,
  ververs: () => TAB === 'indeling' ? indRender() : null,
});
op('taken', () => { if (TAB === 'indeling') indRender(); });

const groepNaam = id => (CFG.groepen || []).find(g => g.id === id)?.naam || 'Zonder groep';

function indToon(pad = []) {
  indGroep = pad[0] === 'groep' ? (pad[1] === 'geen' ? '' : pad[1] || null) : null;
  window.scrollTo(0, 0);
  return indRender();
}

async function indRender() {
  const g = indGroep;
  if (!CFG.groepen) return;   // config nog niet geladen; config-hook tekent opnieuw
  await loadCats();   // CATS + SYSTEMEN (tabblad Categorieën)
  if (g !== indGroep) return;
  $('#indeling').innerHTML = g == null ? indOverzicht() : indGroepPagina(g);
}

// taken van een lijst systemen: [achterstallig, binnenkort]
function sysStatus(systemen) {
  const namen = new Set(CATS.filter(c => systemen.some(s => s.id === c.systeem_id)).map(c => c.naam));
  const taken = TASKS.filter(t => namen.has(t.categorie));
  return [taken.filter(t => t.status === 'achterstallig').length, taken.filter(t => t.status === 'binnenkort').length];
}
const statusChips = ([te, bijna]) => als(te || bijna, `<div class="kaartstatus">${als(te, `<span class="chip bad">${te} achterstallig</span>`)}${als(bijna, `<span class="chip warn">${bijna} binnenkort</span>`)}</div>`);
const sysVan = g => SYSTEMEN.filter(s => (s.groep || '') === g);

function indOverzicht() {
  const groepen = [...CFG.groepen];
  if (sysVan('').length) groepen.push({id: '', naam: 'Zonder groep'});
  return `<div class="groepgrid">${groepen.map(g => {
    const sys = sysVan(g.id), ncat = sys.reduce((n, s) => n + s.categorieen, 0);
    return `<div class="card groepkaart${g.id ? '' : ' geen'}" data-groep="${g.id || 'geen'}" role="link" tabindex="0">
      <div class="gicoon">${GROEP_ICOON[g.id] || '📦'}</div>
      <h3>${esc(g.naam)}</h3>
      <div class="use">${sys.length ? `${meervoud(sys.length, 'systeem', 'systemen')} · ${meervoud(ncat, 'categorie', 'categorieën')}` : 'nog geen systemen'}</div>
      ${statusChips(sysStatus(sys))}
      ${als(sys.length, `<div class="gsys">${sys.map(s => esc(s.naam)).join(' · ')}</div>`)}
    </div>`;
  }).join('')}</div>
  <p class="hint">Elk systeem hoort bij één groep. Kies de groep op de pagina van een groep, of in Categorieën met ✎ bij een systeem.</p>`;
}

function indGroepPagina(g) {
  const sys = sysVan(g), naam = groepNaam(g);
  const som = k => sys.reduce((n, s) => n + (s[k] || 0), 0);
  const anders = SYSTEMEN.filter(s => (s.groep || '') !== g);
  return `
    <div class="pkop">
      <button type="button" class="btn terug" data-ind-terug>← Indeling</button>
      <div class="ptitel"><div class="psub">Groep</div><h2>${GROEP_ICOON[g] || ''} ${esc(naam)}</h2></div>
    </div>
    ${statsHtml([
      [sys.length, sys.length === 1 ? 'systeem' : 'systemen'],
      [som('categorieen'), som('categorieen') === 1 ? 'categorie' : 'categorieën'],
      [som('logregels'), som('logregels') === 1 ? 'logregel' : 'logregels'],
      [som('taken'), som('taken') === 1 ? 'taak' : 'taken'],
    ])}
    ${sys.length ? `<div class="catgrid">${sys.map(s => sysKaart(s, g)).join('')}</div>` : leeg(g ? `Nog geen systemen in ${esc(naam)}.` : 'Alle systemen hebben een groep.')}
    ${als(g, `
    <form class="catadd" id="indSysNieuw">
      <input name="naam" placeholder="Nieuw systeem in ${esc(naam)}, bijv. Koelwater" maxlength="60" required>
      <button class="btn primary" type="submit">Toevoegen</button>
    </form>
    ${als(anders.length, `<form class="catadd" id="indSysKies">
      <select name="sys" aria-label="Bestaand systeem" required><option value="">Bestaand systeem naar ${esc(naam)}…</option>
        ${anders.map(s => `<option value="${s.id}">${esc(s.naam)}${s.groep ? ` (nu ${esc(groepNaam(s.groep))})` : ''}</option>`).join('')}</select>
      <button class="btn" type="submit">Verplaatsen</button>
    </form>`)}`)}`;
}

function sysKaart(s, g) {
  const cats = CATS.filter(c => c.systeem_id === s.id);
  return `<div class="card catkaart" data-sys="${s.id}" role="link" tabindex="0">
    <div class="kaartkop"><h3>${esc(s.naam)}</h3>
      ${als(g, `<button type="button" class="ib" data-uitgroep="${s.id}" title="Uit ${esc(groepNaam(g))} halen" aria-label="Uit groep halen">×</button>`)}</div>
    <div class="use">${[meervoud(s.categorieen, 'categorie', 'categorieën'), als(s.logregels, meervoud(s.logregels, 'logregel', 'logregels')),
      als(s.taken, meervoud(s.taken, 'taak', 'taken'))].filter(Boolean).join(' · ')}</div>
    ${statusChips(sysStatus([s]))}
    ${als(cats.length, `<div class="gcats">${cats.map(c => chip(c.naam)).join('')}</div>`)}
  </div>`;
}

async function zetGroep(id, groep) {
  await api(`api/systemen/${id}/groep`, json('PUT', {groep}));
  await loadCats(); refreshCategoryLists();
  await indRender();
}

$('#indeling').addEventListener('click', async ev => {
  const t = ev.target;
  if (t.closest('[data-ind-terug]')) { ga('onderhoud', 'indeling'); return; }
  const uit = t.closest('[data-uitgroep]');
  if (uit) {
    const s = SYSTEMEN.find(x => x.id === +uit.dataset.uitgroep);
    if (!confirm(`"${s.naam}" uit ${groepNaam(s.groep)} halen? Het systeem blijft bestaan, zonder groep.`)) return;
    try { await zetGroep(s.id, null); toast('Uit de groep gehaald'); } catch (e) { toast(e.message); }
    return;
  }
  const kaart = t.closest('[data-groep], [data-sys]');
  if (kaart?.dataset.groep) ga('onderhoud', 'indeling', 'groep', kaart.dataset.groep);
  else if (kaart) ga('onderhoud', 'cats', 'sys', kaart.dataset.sys);
});
$('#indeling').addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches('[data-groep], [data-sys]')) ev.target.click();
});

$('#indeling').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target;
  try {
    if (f.id === 'indSysNieuw') {
      await api('api/systemen', json('POST', {naam: f.naam.value, groep: indGroep}));
      toast('Systeem toegevoegd');
    } else if (f.id === 'indSysKies') {
      await api(`api/systemen/${f.sys.value}/groep`, json('PUT', {groep: indGroep}));
      toast('Systeem verplaatst');
    }
    await loadCats(); refreshCategoryLists();
    await indRender();
  } catch (e) { toast(e.message); }
});
