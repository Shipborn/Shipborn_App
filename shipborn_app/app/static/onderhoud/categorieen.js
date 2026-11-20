// Onderhoud › Categorieën: systemen en categorieën beheren (toevoegen, hernoemen, volgorde, verwijderen,
// categorie in een systeem zetten) en de logregels per categorie of per systeem.
// Een systeem bundelt categorieën; in de lijst staat elk systeem als kop met zijn categorieën eronder,
// daarna de categorieën zonder systeem.
let CATS = [], SYSTEMEN = [], catEdit = null, catView = null;   // catEdit: 'cat:<id>' / 'sys:<id>'; catView: {soort, ...}

tabblad('cats', {
  toon: () => loadCats(),
  ververs: () => loadCats(),
  naVerversen: () => catView != null && $('#catDlg').open ? renderCatView() : null,
});

async function loadCats() {
  [CATS, SYSTEMEN] = await Promise.all([api('api/categories'), api('api/systemen')]);
  renderCats();
}

// keuzelijsten in filters en formulieren van alle tabbladen bijwerken
function refreshCategoryLists() {
  CFG.categories = CATS.map(c => c.naam);
  CFG.systemen = SYSTEMEN.map(s => ({id: s.id, naam: s.naam,
    categorieen: CATS.filter(c => c.systeem_id === s.id).map(c => c.naam)}));
  vulCategorieKeuzes();
}

async function catsChanged(reloadAll = false) {
  await loadCats();
  refreshCategoryLists();
  if (reloadAll) await verversAlles();
}

// categorieën per groep, in volgorde: [[systeem, [cat...]], ..., [null, [zonder systeem]]]
function catGroepen() {
  const groepen = SYSTEMEN.map(s => [s, CATS.filter(c => c.systeem_id === s.id)]);
  groepen.push([null, CATS.filter(c => !SYSTEMEN.some(s => s.id === c.systeem_id))]);
  return groepen;
}

const sysOpties = (keuze, eerste = '— geen systeem —') => `<option value="">${eerste}</option>` +
  SYSTEMEN.map(s => `<option value="${s.id}"${s.id === keuze ? ' selected' : ''}>${esc(s.naam)}</option>`).join('');

// ---------------------------------------------------------------- lijst
function renderCats() {
  const groepen = catGroepen(), html = [];
  groepen.forEach(([s, cats], gi) => {
    if (s) html.push(catEdit === 'sys:' + s.id ? sysEditRow(s) : sysRow(s, gi, groepen.length - 1));
    else if (SYSTEMEN.length && cats.length) html.push('<h3 class="cat-los">Zonder systeem</h3>');
    cats.forEach((c, i) => html.push(catEdit === 'cat:' + c.id ? catEditRow(c, !!s) : catRow(c, i, cats.length, !!s)));
  });
  $('#cats').innerHTML = CATS.length || SYSTEMEN.length ? html.join('') : leeg('Nog geen categorieën.');
  const sel = $('#catAdd .syskeuze'), keep = sel.value;
  sel.innerHTML = sysOpties(null); sel.value = SYSTEMEN.some(s => s.id == keep) ? keep : '';
  sel.hidden = !SYSTEMEN.length;
  const inp = $('#cats [data-edit]');
  if (inp) { inp.focus(); inp.select(); }
}

const knop = (act, titel, tekst, extra = '') => `<button class="ib${act === 'del' ? ' danger' : ''}" data-act="${act}" ${extra} title="${titel}" aria-label="${titel}">${tekst}</button>`;
const gebruik = x => [als(x.categorieen, meervoud(x.categorieen, 'categorie', 'categorieën')),
  als(x.logregels, meervoud(x.logregels, 'logregel', 'logregels')),
  als(x.taken, meervoud(x.taken, 'taak', 'taken'))].filter(Boolean).join(' · ') || 'niet gebruikt';

const sysRow = (s, i, n) => `
  <div class="card catrow sysrow" data-soort="sys" data-id="${s.id}">
    <div class="info" data-act="open" title="Logregels van dit systeem bekijken"><div class="name">${esc(s.naam)}</div><div class="use">Systeem · ${gebruik(s)}</div></div>
    <a class="ib pdf" href="api/pdf/systeem/${s.id}" download title="PDF van alle logregels in dit systeem">PDF</a>
    ${knop('up', 'Omhoog', '↑', i === 0 ? 'disabled' : '')}
    ${knop('down', 'Omlaag', '↓', i === n - 1 ? 'disabled' : '')}
    ${knop('edit', 'Hernoemen', '✎')}
    ${knop('del', 'Verwijderen', '🗑')}
  </div>`;

const sysEditRow = s => `
  <div class="card catrow sysrow bewerk" data-soort="sys" data-id="${s.id}">
    <input value="${esc(s.naam)}" maxlength="60" data-edit aria-label="Naam van het systeem">
    ${knop('save', 'Opslaan', '✓')}
    ${knop('cancel', 'Annuleren', '×')}
  </div>`;

const catRow = (c, i, n, insys) => `
  <div class="card catrow${insys ? ' insys' : ''}" data-soort="cat" data-id="${c.id}">
    <div class="info" data-act="open" title="Logregels bekijken"><div class="name">${esc(c.naam)}</div><div class="use">${gebruik({...c, categorieen: 0})}</div></div>
    <a class="ib pdf" href="api/pdf/category/${c.id}" download title="PDF van alle logregels in deze categorie">PDF</a>
    ${knop('up', 'Omhoog', '↑', i === 0 ? 'disabled' : '')}
    ${knop('down', 'Omlaag', '↓', i === n - 1 ? 'disabled' : '')}
    ${knop('edit', 'Hernoemen of ander systeem', '✎')}
    ${knop('del', 'Verwijderen', '🗑')}
  </div>`;

const catEditRow = (c, insys) => `
  <div class="card catrow bewerk${insys ? ' insys' : ''}" data-soort="cat" data-id="${c.id}">
    <input value="${esc(c.naam)}" maxlength="60" data-edit aria-label="Naam van de categorie">
    ${als(SYSTEMEN.length, `<select class="syskeuze" data-sys aria-label="Systeem">${sysOpties(c.systeem_id)}</select>`)}
    ${knop('save', 'Opslaan', '✓')}
    ${knop('cancel', 'Annuleren', '×')}
  </div>`;

$('#sysAdd').addEventListener('submit', async ev => {
  ev.preventDefault();
  const inp = ev.target.naam;
  try {
    const r = await api('api/systemen', json('POST', {naam: inp.value}));
    inp.value = ''; toast('Systeem toegevoegd');
    $('#catAdd .syskeuze').value = '';
    await catsChanged();
    $('#catAdd .syskeuze').value = r.id;   // nieuwe categorieën komen meteen in dit systeem
  } catch (e) { toast(e.message); }
});

$('#catAdd').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target;
  try {
    await api('api/categories', json('POST', {naam: f.naam.value, systeem_id: f.systeem_id.value ? +f.systeem_id.value : null}));
    f.naam.value = ''; toast('Categorie toegevoegd');
    await catsChanged();
  } catch (e) { toast(e.message); }
});

async function saveCatEdit(row) {
  const id = +row.dataset.id, naam = $('[data-edit]', row).value.trim();
  try {
    if (row.dataset.soort === 'sys') {
      await api('api/systemen/' + id, json('PUT', {naam}));
      catEdit = null; toast('Hernoemd');
      await catsChanged(true);
      return;
    }
    const c = CATS.find(x => x.id === id), sel = $('[data-sys]', row);
    const sid = sel && sel.value ? +sel.value : null, hernoemd = naam !== c.naam;
    if (hernoemd) await api('api/categories/' + id, json('PUT', {naam}));
    if (sel && sid !== (c.systeem_id ?? null)) await api(`api/categories/${id}/systeem`, json('PUT', {systeem_id: sid}));
    catEdit = null; toast('Opgeslagen');
    await catsChanged(hernoemd);
  } catch (e) { toast(e.message); }
}

// volgorde binnen de groep wisselen; de categorieën krijgen de volgorde zoals ze in de lijst staan
async function verplaats(soort, id, stap) {
  if (soort === 'sys') {
    const i = SYSTEMEN.findIndex(s => s.id === id), j = i + stap;
    [SYSTEMEN[i], SYSTEMEN[j]] = [SYSTEMEN[j], SYSTEMEN[i]];
  } else {
    const groep = catGroepen().find(([, cats]) => cats.some(c => c.id === id))[1];
    const i = groep.findIndex(c => c.id === id), j = i + stap;
    [groep[i], groep[j]] = [groep[j], groep[i]];
    CATS = herschik(groep);
  }
  renderCats();
  try {
    await api(soort === 'sys' ? 'api/systemen/order' : 'api/categories/order',
      json('PUT', {ids: (soort === 'sys' ? SYSTEMEN : CATS).map(x => x.id)}));
    refreshCategoryLists();
  } catch (e) { toast(e.message); loadCats(); }
}

// CATS in lijstvolgorde zetten, met de groep van de verplaatste categorie in haar nieuwe volgorde
function herschik(groep) {
  const ids = new Set(groep.map(c => c.id));
  return catGroepen().flatMap(([, cats]) => cats.some(c => ids.has(c.id)) ? groep : cats);
}

$('#cats').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const row = b.closest('.catrow'), id = +row.dataset.id, soort = row.dataset.soort;
  const x = (soort === 'sys' ? SYSTEMEN : CATS).find(y => y.id === id);
  const act = b.dataset.act;
  if (act === 'open') { openCatView(soort === 'sys' ? {soort, id} : {soort, naam: x.naam}); return; }
  if (act === 'edit') { catEdit = soort + ':' + id; renderCats(); return; }
  if (act === 'cancel') { catEdit = null; renderCats(); return; }
  if (act === 'save') { saveCatEdit(row); return; }
  if (act === 'up' || act === 'down') { verplaats(soort, id, act === 'up' ? -1 : 1); return; }
  if (act === 'del') {
    if (soort === 'sys') {
      if (!confirm(`Systeem "${x.naam}" verwijderen?` + (x.categorieen ? `\n\nDe ${meervoud(x.categorieen, 'categorie', 'categorieën')} blijven bestaan, zonder systeem.` : ''))) return;
      try { await api('api/systemen/' + id, {method: 'DELETE'}); toast('Verwijderd'); await catsChanged(); }
      catch (e) { toast(e.message); }
      return;
    }
    const n = x.logregels + x.taken;
    if (!confirm(`Categorie "${x.naam}" verwijderen?` + (n ? `\n\n${n} logregel(s) en/of taken blijven bewaard, maar zonder categorie.` : ''))) return;
    try {
      await api('api/categories/' + id, {method: 'DELETE'});
      toast('Verwijderd');
      await catsChanged(n > 0);
    } catch (e) { toast(e.message); }
  }
});

$('#cats').addEventListener('keydown', ev => {
  if (!ev.target.matches('[data-edit], [data-sys]')) return;
  if (ev.key === 'Enter') { ev.preventDefault(); saveCatEdit(ev.target.closest('.catrow')); }
  if (ev.key === 'Escape') { ev.preventDefault(); catEdit = null; renderCats(); }
});

// ---------------------------------------------------------------- logregels per categorie of systeem
// openCatView({soort: 'cat', naam}) of openCatView({soort: 'sys', id}); openCatView('naam') kan ook (oude aanroepen)
async function openCatView(v) {
  catView = typeof v === 'string' ? {soort: 'cat', naam: v} : v;
  await renderCatView();
  if (!$('#catDlg').open) $('#catDlg').showModal();
}

async function renderCatView() {
  if (!CATS.length && !SYSTEMEN.length) await loadCats();
  const sys = catView.soort === 'sys' ? SYSTEMEN.find(s => s.id === catView.id) : null;
  if (catView.soort === 'sys' && !sys) { $('#catDlg').close(); return; }
  const namen = sys ? CATS.filter(c => c.systeem_id === sys.id).map(c => c.naam) : [catView.naam];
  const list = await api(sys ? 'api/entries?systeem=' + sys.id : 'api/entries?categorie=' + encodeURIComponent(catView.naam));
  const tijd = list.reduce((s, e) => s + (e.duur_minuten || 0), 0);
  const taken = TASKS.filter(t => namen.includes(t.categorie));
  const cat = sys ? null : CATS.find(c => c.naam === catView.naam);
  const body = $('#catBody');
  $('#catTitle').textContent = sys ? sys.naam : catView.naam;
  $('#catNew').hidden = !!sys;
  const sysNaam = cat && SYSTEMEN.find(s => s.id === cat.systeem_id)?.naam;
  body.innerHTML = `
    ${sys ? `<p class="hnote">Systeem met ${namen.length ? esc(namen.join(', ')) : 'nog geen categorieën'}.</p>`
      : als(sysNaam, `<p class="hint" style="margin:0 0 10px">Onderdeel van systeem <b>${esc(sysNaam)}</b>.</p>`) + `
    <div class="catents"><h3>Meetwaarden uit Home Assistant
      <span class="hint">(bij elke nieuwe logregel in deze categorie automatisch opgeslagen)</span></h3>
      <div class="entpick" id="catEnts"></div></div>`}
    ${statsHtml([
      [list.length, list.length === 1 ? 'logregel' : 'logregels'],
      [tijd ? fmtDur(tijd) : '—', 'totale tijd'],
      [taken.length, taken.length === 1 ? 'taak' : 'taken'],
    ])}
    ${list.length ? tijdlijnHtml(body, list, e => [sys && e.categorie, e.taak_naam && `⟳ ${e.taak_naam}`].filter(Boolean).map(esc).join(' · '))
      : leeg(sys ? 'Nog geen logregels in dit systeem.' : 'Nog geen logregels in deze categorie.')}`;
  if (cat) entPicker($('#catEnts'), cat.entiteiten || [], async ids => {
    try {
      const r = await api(`api/categories/${cat.id}/entiteiten`, json('PUT', {entiteiten: ids}));
      cat.entiteiten = r.entiteiten; toast('Meetwaarden opgeslagen');
    } catch (e) { toast(e.message); }
  });
}

$('#catBody').addEventListener('click', tlClick);
$('#catNew').addEventListener('click', () => openEntry(null, {categorie: catView.naam}));
$('#catDlg').addEventListener('close', () => { catView = null; });
