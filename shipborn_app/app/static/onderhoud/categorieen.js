// Onderhoud › Categorieën: systemen en categorieën beheren (toevoegen, hernoemen, volgorde, verwijderen,
// categorie in een systeem zetten) en per systeem of categorie een eigen pagina.
// Een systeem bundelt categorieën; in de lijst staat elk systeem als kop met zijn categorieën eronder,
// daarna de categorieën zonder systeem.
// Pagina's (#onderhoud/cats/sys/<id>, #onderhoud/cats/cat/<id>): systeem = kaarten van zijn categorieën + logregels;
// categorie = documenten (foto's, PDF's), onderdelen, taken, meetwaarden en logregels.
let CATS = [], SYSTEMEN = [], catEdit = null;   // catEdit: 'cat:<id>' / 'sys:<id>'
let catPagina = null, CATDOCS = [], CATONDS = [], DOC_BUSY = false;   // catPagina: {soort: 'cat'|'sys', id}
const SEC_DICHT = new Set(['ents']);   // dichtgeklapte onderdelen van de categoriepagina (blijft bij verversen)

tabblad('cats', {
  toon: pad => catsToon(pad),
  config: cfg => {
    if (HA_ANDROID) $('#docFile').removeAttribute('multiple');
    $('#sysAdd [name=groep]').innerHTML = groepOpties(null, '— groep —');
  },
  ververs: () => catPagina ? null : loadCats(),
});
// de pagina gebruikt TASKS: opnieuw tekenen zodra de taken (opnieuw) geladen zijn, ook na elke wijziging
op('taken', () => { if (catPagina && TAB === 'cats') renderCatPagina(); });

async function catsToon(pad = []) {
  const [soort, id] = pad;
  catPagina = (soort === 'cat' || soort === 'sys') && +id ? {soort, id: +id} : null;
  $('#catsLijst').hidden = !!catPagina;
  $('#catPagina').hidden = !catPagina;
  if (catPagina) { $('#catPagina').innerHTML = leeg('Laden…'); window.scrollTo(0, 0); await renderCatPagina(); }
  else await loadCats();
}

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
  als(x.taken, meervoud(x.taken, 'taak', 'taken')),
  als(x.documenten, meervoud(x.documenten, 'document', 'documenten')),
  als(x.onderdelen, meervoud(x.onderdelen, 'onderdeel', 'onderdelen'))].filter(Boolean).join(' · ') || 'niet gebruikt';

// groepen (Casco, Techniek, …) komen uit CFG.groepen; zie Onderhoud › Indeling
const groepOpties = (keuze, eerste = '— geen groep —') => `<option value="">${eerste}</option>` +
  (CFG.groepen || []).map(g => `<option value="${g.id}"${g.id === keuze ? ' selected' : ''}>${esc(g.naam)}</option>`).join('');
const groepVan = s => (CFG.groepen || []).find(g => g.id === s?.groep);

const sysRow = (s, i, n) => `
  <div class="card catrow sysrow" data-soort="sys" data-id="${s.id}">
    <div class="info" data-act="open" title="Pagina van dit systeem openen"><div class="name">${esc(s.naam)}</div><div class="use">Systeem${groepVan(s) ? ' in ' + esc(groepVan(s).naam) : ''} · ${gebruik(s)}</div></div>
    <a class="ib pdf" href="api/pdf/systeem/${s.id}" download title="PDF van alle logregels in dit systeem">PDF</a>
    ${knop('up', 'Omhoog', '↑', i === 0 ? 'disabled' : '')}
    ${knop('down', 'Omlaag', '↓', i === n - 1 ? 'disabled' : '')}
    ${knop('edit', 'Hernoemen of andere groep', '✎')}
    ${knop('del', 'Verwijderen', '🗑')}
  </div>`;

const sysEditRow = s => `
  <div class="card catrow sysrow bewerk" data-soort="sys" data-id="${s.id}">
    <input value="${esc(s.naam)}" maxlength="60" data-edit aria-label="Naam van het systeem">
    <select class="syskeuze" data-groep aria-label="Groep">${groepOpties(s.groep || '')}</select>
    ${knop('save', 'Opslaan', '✓')}
    ${knop('cancel', 'Annuleren', '×')}
  </div>`;

const catRow = (c, i, n, insys) => `
  <div class="card catrow${insys ? ' insys' : ''}" data-soort="cat" data-id="${c.id}">
    <div class="info" data-act="open" title="Pagina van deze categorie openen"><div class="name">${esc(c.naam)}</div><div class="use">${gebruik({...c, categorieen: 0})}</div></div>
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
    const r = await api('api/systemen', json('POST', {naam: inp.value, groep: ev.target.groep.value || null}));
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
      const s = SYSTEMEN.find(x => x.id === id), groep = $('[data-groep]', row).value || null;
      const hernoemd = naam !== s.naam;
      if (hernoemd) await api('api/systemen/' + id, json('PUT', {naam}));
      if (groep !== (s.groep || null)) await api(`api/systemen/${id}/groep`, json('PUT', {groep}));
      catEdit = null; toast('Opgeslagen');
      await catsChanged(hernoemd);
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
  if (act === 'open') { openCatView({soort, id}); return; }
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
  if (!ev.target.matches('[data-edit], [data-sys], [data-groep]')) return;
  if (ev.key === 'Enter') { ev.preventDefault(); saveCatEdit(ev.target.closest('.catrow')); }
  if (ev.key === 'Escape') { ev.preventDefault(); catEdit = null; renderCats(); }
});

// ---------------------------------------------------------------- pagina's van systeem en categorie
// openCatView({soort: 'cat'|'sys', id}); openCatView('naam') kan ook (categorie op naam, oude aanroepen)
function openCatView(v) {
  if (typeof v === 'string') v = {soort: 'cat', id: CATS.find(c => c.naam === v)?.id};
  if (!v?.id) return;
  ga('onderhoud', 'cats', v.soort, v.id);
}

async function renderCatPagina() {
  const p = catPagina;
  if (!p) return;
  await loadCats();
  if (catPagina !== p) return;   // intussen ergens anders heen
  const x = (p.soort === 'sys' ? SYSTEMEN : CATS).find(y => y.id === p.id);
  if (!x) { toast(p.soort === 'sys' ? 'Systeem niet gevonden' : 'Categorie niet gevonden'); ga('onderhoud', 'cats'); return; }
  return p.soort === 'sys' ? renderSysPagina(x, p) : renderCatDetail(x, p);
}

const tijdTotaal = list => list.reduce((s, e) => s + (e.duur_minuten || 0), 0);

// kop van een pagina: terugknop, titel met onderschrift, PDF en eventueel extra knoppen
const paginaKop = (terug, titel, sub, pdf, extra = '') => `
  <div class="pkop">
    <button type="button" class="btn terug" data-terug="${esc(terug.pad.join('/'))}">← ${esc(terug.naam)}</button>
    <div class="ptitel"><div class="psub">${sub}</div><h2>${esc(titel)}</h2></div>
    <div class="pknop"><a class="btn" href="${pdf}" download title="PDF van deze pagina">PDF</a>${extra}</div>
  </div>`;

// inklapbaar blok; sec = sleutel om dicht/open te onthouden
const paginaSec = (sec, titel, n, inhoud) => `
  <details class="psec" data-sec="${sec}"${SEC_DICHT.has(sec) ? '' : ' open'}>
    <summary>${titel}${n != null ? ` <span class="n">${n}</span>` : ''}</summary>
    <div class="psecbody">${inhoud}</div>
  </details>`;

// ---- systeem: kaarten van de categorieën
async function renderSysPagina(s, p) {
  const cats = CATS.filter(c => c.systeem_id === s.id), namen = cats.map(c => c.naam);
  const list = await api('api/entries?systeem=' + s.id);
  if (catPagina !== p) return;
  const taken = TASKS.filter(t => namen.includes(t.categorie)), tijd = tijdTotaal(list);
  const el = $('#catPagina');
  el.innerHTML = `
    ${paginaKop(groepVan(s) ? {naam: groepVan(s).naam, pad: ['onderhoud', 'indeling', 'groep', s.groep]}
      : {naam: 'Categorieën', pad: ['onderhoud', 'cats']}, s.naam,
      groepVan(s) ? `Systeem in <b>${esc(groepVan(s).naam)}</b>` : 'Systeem (nog geen groep: kies er een met ✎ in de lijst)', `api/pdf/systeem/${s.id}`)}
    ${statsHtml([
      [cats.length, cats.length === 1 ? 'categorie' : 'categorieën'],
      [list.length, list.length === 1 ? 'logregel' : 'logregels'],
      [tijd ? fmtDur(tijd) : '—', 'totale tijd'],
      [taken.length, taken.length === 1 ? 'taak' : 'taken'],
    ])}
    <h3 class="pkop2">Categorieën in dit systeem</h3>
    ${cats.length ? `<div class="catgrid">${cats.map(catKaart).join('')}</div>` : leeg('Nog geen categorieën in dit systeem.')}
    <form class="catadd" id="sysCatAdd">
      <input name="naam" placeholder="Nieuwe categorie in ${esc(s.naam)}" maxlength="60" required>
      <button class="btn" type="submit">Toevoegen</button>
    </form>
    ${paginaSec('sys-log', 'Logregels', list.length, '<div class="pTl"></div>')}`;
  const tl = $('.pTl', el);
  tl.innerHTML = list.length ? tijdlijnHtml(tl, list, e => [e.categorie, e.taak_naam && `⟳ ${e.taak_naam}`].filter(Boolean).map(esc).join(' · '))
    : leeg('Nog geen logregels in dit systeem.');
}

function catKaart(c) {
  const taken = TASKS.filter(t => t.categorie === c.naam);
  const te = taken.filter(t => t.status === 'achterstallig').length, bijna = taken.filter(t => t.status === 'binnenkort').length;
  return `<div class="card catkaart" data-kaart="${c.id}" role="link" tabindex="0">
    <h3>${esc(c.naam)}</h3>
    <div class="use">${gebruik({...c, categorieen: 0})}</div>
    ${als(c.laatste, `<div class="use">Laatste logregel ${fmtDate(c.laatste)}</div>`)}
    ${als(te || bijna, `<div class="kaartstatus">${als(te, `<span class="chip bad">${te} achterstallig</span>`)}${als(bijna, `<span class="chip warn">${bijna} binnenkort</span>`)}</div>`)}
    ${als(c.thumbs?.length, `<div class="kaartfotos">${c.thumbs.map(t => `<img loading="lazy" src="photos/${t}" alt="">`).join('')}</div>`)}
  </div>`;
}

// ---- categorie: documenten, onderdelen, taken, meetwaarden, logregels
async function renderCatDetail(c, p) {
  const s = SYSTEMEN.find(x => x.id === c.systeem_id);
  const [list, docs, onds] = await Promise.all([api('api/entries?categorie=' + encodeURIComponent(c.naam)),
    api(`api/categories/${c.id}/documenten`), api(`api/categories/${c.id}/onderdelen`)]);
  if (catPagina !== p) return;
  CATDOCS = docs; CATONDS = onds;
  const taken = TASKS.filter(t => t.categorie === c.naam), tijd = tijdTotaal(list);
  const el = $('#catPagina');
  el.innerHTML = `
    ${paginaKop(s ? {naam: s.naam, pad: ['onderhoud', 'cats', 'sys', s.id]} : {naam: 'Categorieën', pad: ['onderhoud', 'cats']}, c.naam,
      s ? `Categorie in systeem <b>${esc(s.naam)}</b>` : 'Categorie', `api/pdf/category/${c.id}`,
      '<button type="button" class="btn primary" data-act="logregel">Nieuwe logregel</button>')}
    ${statsHtml([
      [list.length, list.length === 1 ? 'logregel' : 'logregels'],
      [tijd ? fmtDur(tijd) : '—', 'totale tijd'],
      [taken.length, taken.length === 1 ? 'taak' : 'taken'],
      [docs.length, docs.length === 1 ? 'document' : 'documenten'],
      [onds.length, onds.length === 1 ? 'onderdeel' : 'onderdelen'],
    ])}
    ${paginaSec('docs', "Documenten (foto's en PDF's)", docs.length, '<div class="docs" id="catDocs"></div>')}
    ${paginaSec('ond', 'Onderdelen', onds.length, '<div id="catOnd"></div>')}
    ${paginaSec('taken', 'Taken', taken.length, taken.length ? taken.map(taakRij).join('') : leeg('Nog geen taken in deze categorie.'))}
    ${paginaSec('ents', 'Meetwaarden uit Home Assistant', (c.entiteiten || []).length,
      '<p class="hint">Bij elke nieuwe logregel in deze categorie automatisch opgeslagen.</p><div class="entpick" id="catEnts"></div>')}
    ${paginaSec('log', 'Logregels', list.length, '<div class="pTl"></div>')}`;
  renderDocs(); renderOnd();
  const tl = $('.pTl', el);
  tl.innerHTML = list.length ? tijdlijnHtml(tl, list, e => e.taak_naam ? esc(`⟳ ${e.taak_naam}`) : '')
    : leeg('Nog geen logregels in deze categorie.');
  entPicker($('#catEnts'), c.entiteiten || [], async ids => {
    try {
      const r = await api(`api/categories/${c.id}/entiteiten`, json('PUT', {entiteiten: ids}));
      c.entiteiten = r.entiteiten; toast('Meetwaarden opgeslagen');
    } catch (e) { toast(e.message); }
  });
}

const taakRij = t => `<div class="card taakrij s-${t.status}" data-taak="${t.id}">
  <div class="tnaam">${esc(t.naam)}</div>${statusHtml(t)}<div class="use">${esc(dueText(t))}</div></div>`;

const fmtGrootte = b => !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} kB` : `${fmtNum(b / 1048576)} MB`;
const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');

function renderDocs() {
  const el = $('#catDocs'); if (!el) return;
  const busy = DOC_BUSY ? ' busy' : '';
  const knoppen = d => `<div class="docknop">
      <button type="button" class="ib" data-docedit="${d.id}" title="Omschrijving wijzigen" aria-label="Omschrijving wijzigen">✎</button>
      <a class="ib" href="bestand/${d.id}?download=1" download title="Downloaden" aria-label="Downloaden">⬇</a>
      <button type="button" class="ib danger" data-docdel="${d.id}" title="Verwijderen" aria-label="Verwijderen">🗑</button></div>`;
  const onder = d => `<figcaption>${esc(d.omschrijving || '')}<span class="use">${esc(fmtStamp(d.created_at))}${d.ingevoerd_door ? ' · ' + esc(d.ingevoerd_door) : ''}</span></figcaption>`;
  el.innerHTML = CATDOCS.map(d => d.soort === 'foto'
    ? `<figure class="doc"><img loading="lazy" src="photos/${d.thumb}" data-foto="${d.id}" alt="${esc(d.omschrijving || d.naam)}" title="${esc(d.naam)}">${onder(d)}${knoppen(d)}</figure>`
    : `<figure class="doc"><a class="pdftegel" href="bestand/${d.id}" target="_blank" rel="noopener" title="PDF openen">
        <span>📄</span><b>${esc(d.naam)}</b><small>PDF · ${fmtGrootte(d.grootte)}</small></a>${onder(d)}${knoppen(d)}</figure>`).join('') +
    `<div class="addrow"><label class="addph${busy}" for="docCam"><span>📷</span>Foto maken</label>` +
    `<label class="addph${busy}" for="docFile"><span>📎</span>${DOC_BUSY ? 'Bezig…' : 'Foto of PDF'}</label></div>`;
}

async function docUpload(files) {
  const p = catPagina;
  if (!files.length || p?.soort !== 'cat') return;
  DOC_BUSY = true; renderDocs();
  try {
    const fd = new FormData();
    for (const f of files) fd.append('bestand', isPdf(f) ? f : await shrinkPhoto(f));
    await api(`api/categories/${p.id}/documenten`, {method: 'POST', body: fd});
    toast(files.length === 1 ? 'Document toegevoegd' : `${files.length} documenten toegevoegd`);
  } catch (e) { toast(e.message); }
  DOC_BUSY = false;
  if (catPagina === p) await renderCatPagina();
}
const docGekozen = ev => { const files = [...ev.target.files]; ev.target.value = ''; docUpload(files); };
$('#docFile').addEventListener('change', docGekozen);
$('#docCam').addEventListener('change', docGekozen);

function renderOnd() {
  const el = $('#catOnd'); if (!el) return;
  const det = o => [o.merk, o.artikelnummer && 'art.nr. ' + o.artikelnummer, o.leverancier].filter(Boolean).map(esc).join(' · ');
  el.innerHTML = (CATONDS.length ? `<div class="ondlijst">${CATONDS.map((o, i) => `
    <div class="ond" data-ond="${o.id}">
      <div class="ondinfo" data-act="ondopen" title="Wijzigen">
        <div class="ondnaam">${als(o.aantal, `<span class="aantal">${esc(o.aantal)} ×</span> `)}${esc(o.naam)}</div>
        ${als(det(o), `<div class="use">${det(o)}</div>`)}
        ${als(o.opmerking, `<div class="ondopm">${esc(o.opmerking)}</div>`)}
      </div>
      ${knop('ondup', 'Omhoog', '↑', i === 0 ? 'disabled' : '')}
      ${knop('onddown', 'Omlaag', '↓', i === CATONDS.length - 1 ? 'disabled' : '')}
    </div>`).join('')}</div>` : leeg('Nog geen onderdelen. Zet hier bijvoorbeeld filters, impellers, V-snaren of zekeringen met hun artikelnummer.')) +
    '<button type="button" class="btn" data-act="ondnieuw">+ Onderdeel toevoegen</button>';
}

let ONDEDIT = null;   // onderdeel in de dialoog (null = nieuw)
function openOnderdeel(o = null) {
  ONDEDIT = o;
  const f = $('#ondForm');
  f.reset();
  for (const k of ['naam', 'merk', 'artikelnummer', 'aantal', 'leverancier', 'opmerking']) f[k].value = o?.[k] ?? '';
  $('#ondTitle').textContent = o ? 'Onderdeel wijzigen' : 'Nieuw onderdeel';
  $('#ondDelete').hidden = !o;
  $('#ondDlg').showModal();
  f.naam.focus();
}

$('#ondForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target, p = catPagina;
  const d = Object.fromEntries(['naam', 'merk', 'artikelnummer', 'aantal', 'leverancier', 'opmerking'].map(k => [k, f[k].value]));
  try {
    await (ONDEDIT ? api('api/onderdelen/' + ONDEDIT.id, json('PUT', d)) : api(`api/categories/${p.id}/onderdelen`, json('POST', d)));
    $('#ondDlg').close(); toast(ONDEDIT ? 'Onderdeel opgeslagen' : 'Onderdeel toegevoegd');
    await renderCatPagina();
  } catch (e) { toast(e.message); }
});

$('#ondDelete').addEventListener('click', async () => {
  if (!ONDEDIT || !confirm(`Onderdeel "${ONDEDIT.naam}" verwijderen?`)) return;
  try {
    await api('api/onderdelen/' + ONDEDIT.id, {method: 'DELETE'});
    $('#ondDlg').close(); toast('Verwijderd');
    await renderCatPagina();
  } catch (e) { toast(e.message); }
});

async function ondVerplaats(id, stap) {
  const i = CATONDS.findIndex(o => o.id === id), j = i + stap;
  if (j < 0 || j >= CATONDS.length) return;
  [CATONDS[i], CATONDS[j]] = [CATONDS[j], CATONDS[i]];
  renderOnd();
  try { CATONDS = await api(`api/categories/${catPagina.id}/onderdelen/order`, json('PUT', {ids: CATONDS.map(o => o.id)})); }
  catch (e) { toast(e.message); renderCatPagina(); }
}

// ---- klikken op de pagina
$('#catPagina').addEventListener('click', async ev => {
  const t = ev.target;
  const terug = t.closest('[data-terug]');
  if (terug) { ga(...terug.dataset.terug.split('/').filter(Boolean)); return; }
  const kaart = t.closest('[data-kaart]');
  if (kaart) { openCatView({soort: 'cat', id: +kaart.dataset.kaart}); return; }
  const tl = t.closest('.pTl');
  if (tl) { tlClick({target: t, currentTarget: tl}); return; }
  const taak = t.closest('[data-taak]');
  if (taak) { const x = TASKS.find(y => y.id === +taak.dataset.taak); if (x) openTask(x); return; }
  const foto = t.closest('[data-foto]');
  if (foto) {
    const fotos = CATDOCS.filter(d => d.soort === 'foto');
    openLightbox(fotos.map(d => ({src: 'photos/' + d.bestand, cap: d.omschrijving || d.naam})), fotos.findIndex(d => d.id === +foto.dataset.foto));
    return;
  }
  if (IN_PAGE_CAMERA && t.closest('label[for="docCam"]')) { ev.preventDefault(); openCamera(f => docUpload([f])); return; }
  const edit = t.closest('[data-docedit]');
  if (edit) {
    const d = CATDOCS.find(x => x.id === +edit.dataset.docedit);
    const oms = prompt(`Omschrijving bij "${d.naam}"`, d.omschrijving || '');
    if (oms == null) return;
    try { await api('api/documenten/' + d.id, json('PUT', {omschrijving: oms})); d.omschrijving = oms.trim() || null; renderDocs(); }
    catch (e) { toast(e.message); }
    return;
  }
  const del = t.closest('[data-docdel]');
  if (del) {
    const d = CATDOCS.find(x => x.id === +del.dataset.docdel);
    if (!confirm(`"${d.naam}" definitief verwijderen?`)) return;
    try { await api('api/documenten/' + d.id, {method: 'DELETE'}); toast('Verwijderd'); await renderCatPagina(); }
    catch (e) { toast(e.message); }
    return;
  }
  const b = t.closest('[data-act]'); if (!b) return;
  const ond = CATONDS.find(o => o.id === +b.closest('[data-ond]')?.dataset.ond);
  const c = CATS.find(x => x.id === catPagina?.id);
  if (b.dataset.act === 'logregel' && c) openEntry(null, {categorie: c.naam});
  if (b.dataset.act === 'ondnieuw') openOnderdeel();
  if (b.dataset.act === 'ondopen') openOnderdeel(ond);
  if (b.dataset.act === 'ondup' || b.dataset.act === 'onddown') ondVerplaats(ond.id, b.dataset.act === 'ondup' ? -1 : 1);
});

$('#catPagina').addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches('[data-kaart]')) openCatView({soort: 'cat', id: +ev.target.dataset.kaart});
});

// dicht/open van de blokken onthouden ('toggle' bubbelt niet, dus in de capture-fase)
$('#catPagina').addEventListener('toggle', ev => {
  const sec = ev.target.dataset?.sec;
  if (sec) ev.target.open ? SEC_DICHT.delete(sec) : SEC_DICHT.add(sec);
}, true);

$('#catPagina').addEventListener('submit', async ev => {
  if (ev.target.id !== 'sysCatAdd') return;
  ev.preventDefault();
  const f = ev.target;
  try {
    await api('api/categories', json('POST', {naam: f.naam.value, systeem_id: catPagina.id}));
    toast('Categorie toegevoegd');
    await renderCatPagina();
    refreshCategoryLists();
  } catch (e) { toast(e.message); }
});
