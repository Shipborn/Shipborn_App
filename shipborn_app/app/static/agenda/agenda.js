// Agenda: maandkalender met de logregels op datum, ingeplande taken/losse punten en de datum waarop een
// taak volgens haar interval weer moet (verwacht), plus de afspraken uit de gekoppelde agenda (iCloud/Google,
// Instellingen › Agenda). Klik op een dag toont die dag eronder.
let AG_MAAND = null, AG_DAG = today(), AG_ENTRIES = [], AG_PLAN = [], AG_OPEN = [], AG_TAKEN = [], agEditing = null;
let AG_EXTERN = [], AG_KOPPELING = null;

const pad2 = n => String(n).padStart(2, '0');
const isoD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dagLang = d => new Date(d + 'T00:00:00').toLocaleDateString('nl-NL', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});

tabblad('agenda', {
  nieuw: () => openPlanning(null, {datum: AG_DAG}),
  toon: () => { if (AG_KOPPELING?.account && AG_KOPPELING.kalender) syncAgenda(true); },
  laden: () => laadAgenda(),
  ververs: () => laadAgenda(),
});

// taken (status, volgende_datum) komen van het tabblad Taken
op('taken', taken => {
  AG_TAKEN = taken;
  fillSelect($('#planForm [name=task_id]'), taken.filter(t => t.actief).map(t => ({value: t.id, label: t.naam})), '— los punt —');
  renderAgenda();
});

// eerste en laatste dag van het raster (hele weken, maandag t/m zondag)
function agRaster() {
  const [j, m] = AG_MAAND;
  const begin = new Date(j, m, 1); begin.setDate(1 - (begin.getDay() + 6) % 7);
  const eind = new Date(j, m + 1, 0); eind.setDate(eind.getDate() + (7 - eind.getDay()) % 7);
  return [begin, eind];
}

async function laadAgenda() {
  if (!AG_MAAND) { const d = new Date(); AG_MAAND = [d.getFullYear(), d.getMonth()]; }
  const [van, tot] = agRaster().map(isoD), p = `van=${van}&tot=${tot}`;
  let ext;
  [AG_ENTRIES, AG_PLAN, AG_OPEN, ext] = await Promise.all([api('api/entries?' + p), api('api/planning?' + p),
    api('api/planning?open=1'), api('api/agenda/extern?' + p)]);
  AG_EXTERN = ext.afspraken; AG_KOPPELING = ext.koppeling;
  zetTeller('agenda', AG_OPEN.filter(x => x.datum < today()).length);
  renderAgenda();
}

// verwacht: actieve taak met een volgende datum (interval in dagen, vandaag of later) die nog niet is ingepland
const agIngepland = t => AG_OPEN.some(p => p.task_id === t.id);
const agVerwacht = () => AG_TAKEN.filter(t => t.actief && t.volgende_datum >= today() && !agIngepland(t));
// te doen (staat bij vandaag): niet ingepland en te laat, of zonder datum maar wel aan de beurt
// (nog nooit gelogd, of een interval in uren dat (bijna) bereikt is)
const agTeDoen = () => AG_TAKEN.filter(t => t.actief && !agIngepland(t) && (t.volgende_datum
  ? t.volgende_datum < today() : ['achterstallig', 'binnenkort', 'onbekend'].includes(t.status)));
const LEEG_DAG = () => ({log: [], plan: [], verwacht: [], tedoen: [], extern: []});

function agPerDag() {
  const dag = {};
  const zet = (d, soort, x) => ((dag[d] ??= LEEG_DAG())[soort]).push(x);
  AG_ENTRIES.forEach(e => zet(e.datum, 'log', e));
  AG_PLAN.forEach(p => zet(p.datum, 'plan', p));
  agVerwacht().forEach(t => zet(t.volgende_datum, 'verwacht', t));
  agTeDoen().forEach(t => zet(today(), 'tedoen', t));
  // afspraken van meerdere dagen staan op elke dag
  AG_EXTERN.forEach(a => {
    for (const d = new Date(a.datum + 'T00:00:00'); isoD(d) <= a.einddatum; d.setDate(d.getDate() + 1)) zet(isoD(d), 'extern', a);
  });
  for (const x of Object.values(dag)) x.plan.sort((a, b) => (a.tijd || '').localeCompare(b.tijd || ''));
  return dag;
}

// ---------------------------------------------------------------- maand
function renderAgenda() {
  if (!AG_MAAND) return;
  const [j, m] = AG_MAAND, [begin, eind] = agRaster(), dag = agPerDag(), nu = today();
  $('#agMaand').textContent = new Date(j, m, 1).toLocaleDateString('nl-NL', {month: 'long', year: 'numeric'});
  const cellen = [];
  for (const d = new Date(begin); d <= eind; d.setDate(d.getDate() + 1)) {
    const iso = isoD(d), x = dag[iso] || LEEG_DAG();
    const items = [
      ...x.plan.map(p => [`ag-plan${p.gedaan ? ' gedaan' : p.datum < nu ? ' te-laat' : ''}`, (p.tijd ? p.tijd + ' ' : '') + p.titel]),
      ...x.tedoen.map(t => [`ag-verwacht${t.status === 'achterstallig' ? ' te-laat' : ''}`, t.naam]),
      ...x.verwacht.map(t => [`ag-verwacht${t.status === 'achterstallig' ? ' te-laat' : ''}`, t.naam]),
      ...x.extern.map(a => ['ag-extern', (a.tijd && a.datum === iso ? a.tijd + ' ' : '') + a.titel]),
      ...x.log.map(e => ['ag-log', e.titel]),
    ];
    const cls = [d.getMonth() !== m && 'ander', iso === nu && 'vandaag', iso === AG_DAG && 'gekozen'].filter(Boolean).join(' ');
    cellen.push(`<button type="button" class="agdag ${cls}" data-d="${iso}">
      <span class="nr">${d.getDate()}</span>
      ${items.slice(0, 3).map(([c, t]) => `<span class="item ${c}">${esc(t)}</span>`).join('')}
      ${als(items.length > 3, `<span class="meer">+${items.length - 3}</span>`)}
    </button>`);
  }
  $('#agGrid').innerHTML = cellen.join('');
  renderDag(dag[AG_DAG]);
  renderSync();
}

function naarMaand(stap) {
  const [j, m] = AG_MAAND, d = new Date(j, m + stap, 1);
  AG_MAAND = [d.getFullYear(), d.getMonth()];
  laadAgenda().catch(e => toast(e.message));
}
$('#agVorige').addEventListener('click', () => naarMaand(-1));
$('#agVolgende').addEventListener('click', () => naarMaand(1));
$('#agVandaag').addEventListener('click', () => {
  AG_DAG = today(); const d = new Date(); AG_MAAND = [d.getFullYear(), d.getMonth()];
  laadAgenda().catch(e => toast(e.message));
});
$('#agGrid').addEventListener('click', ev => {
  const c = ev.target.closest('.agdag'); if (!c) return;
  AG_DAG = c.dataset.d;
  const [j, m] = AG_DAG.split('-').map(Number);
  if (j !== AG_MAAND[0] || m - 1 !== AG_MAAND[1]) { AG_MAAND = [j, m - 1]; laadAgenda().catch(e => toast(e.message)); }
  else renderAgenda();
});

// ---------------------------------------------------------------- gekozen dag
const agTaak = id => AG_TAKEN.find(t => t.id === id);

function planCard(p) {
  const t = agTaak(p.task_id), teLaat = !p.gedaan && p.datum < today();
  const knop = p.gedaan ? '' : t?.actief ? `<button type="button" class="btn primary" data-uitvoeren="${p.id}">${uitvoerLabel(t)}</button>`
    : !p.task_id ? `<button type="button" class="btn" data-afvinken="${p.id}">Afvinken ✓</button>` : '';
  return `<article class="card agplan${p.gedaan ? ' gedaan' : ''}${teLaat ? ' te-laat' : ''}" data-plan="${p.id}">
    <div class="taskrow"><div class="grow">
      <div class="meta">${p.gedaan ? '<span class="ok">✓ gedaan' + (p.entry_datum ? ' op ' + fmtDate(p.entry_datum) : '') + '</span>'
        : teLaat ? `<span class="laat">gepland ${fmtDate(p.datum)}</span>` : '<span>gepland</span>'}
        ${p.tijd ? `<span>${p.tijd}${p.duur_minuten ? ' · ' + fmtDur(p.duur_minuten) : ''}</span>` : ''}
        ${chip(p.taak_categorie)} ${chip(p.task_id && '⟳ onderhoudstaak')}</div>
      <h3>${esc(p.titel)}</h3>
      ${als(p.notitie, `<p class="desc">${esc(p.notitie)}</p>`)}
      ${t && !p.gedaan ? `<div class="due">Volgende volgens interval: ${dueText(t)}</div>` : ''}
    </div>${knop}</div>
  </article>`;
}

// waarom een taak bij "te doen" staat
const teDoenReden = t => t.volgende_datum ? `moest op ${fmtDate(t.volgende_datum)}` : !t.laatst_datum ? 'nog nooit gelogd' : dueText(t);

const verwachtCard = (t, uitleg = 'verwacht volgens interval') => `<article class="card s-${t.status}" data-taak="${t.id}">
    <div class="taskrow"><div class="grow">
      <div class="meta">${statusHtml(t)} ${chip(t.categorie)} <span>${esc(uitleg)}</span></div>
      <h3>${esc(t.naam)}</h3>
      <div class="due">${laatstText(t)}</div>
    </div>
    <button type="button" class="btn" data-inplannen="${t.id}">Inplannen</button>
    <button type="button" class="btn primary" data-taakuit="${t.id}">${uitvoerLabel(t)}</button></div>
  </article>`;

const externCard = a => `<article class="card agextern">
    <div class="meta"><span>${a.tijd ? `${a.tijd}–${a.eindtijd}` : 'hele dag'}</span>
      ${a.einddatum !== a.datum ? `<span>${fmtDate(a.datum)} – ${fmtDate(a.einddatum)}</span>` : ''}</div>
    <h3>${esc(a.titel)}</h3>
    ${a.locatie ? `<div class="due">📍 ${esc(a.locatie)}</div>` : ''}
    ${a.omschrijving ? `<p class="desc">${esc(a.omschrijving)}</p>` : ''}
  </article>`;

function renderDag(x = LEEG_DAG()) {
  const nu = today();
  // vandaag: ook wat eerder gepland was en nog open staat
  const eerder = AG_DAG === nu ? AG_OPEN.filter(p => p.datum < nu) : [];
  const blok = (titel, html) => als(html, `<h3 class="agkopje">${titel}</h3>${html}`);
  const alles = eerder.length + x.plan.length + x.verwacht.length + x.tedoen.length + x.log.length + x.extern.length;
  $('#agDag').innerHTML = `
    <div class="agdagkop"><h2>${dagLang(AG_DAG)}</h2>
      <button type="button" class="btn" id="agPlanNieuw">+ Inplannen</button></div>
    ${blok('Nog open van eerder', eerder.map(planCard).join(''))}
    ${blok('Gepland', x.plan.map(planCard).join(''))}
    ${blok('Te doen (nog niet ingepland)', x.tedoen.map(t => verwachtCard(t, teDoenReden(t))).join(''))}
    ${blok('Verwacht volgens interval', x.verwacht.map(t => verwachtCard(t)).join(''))}
    ${blok('Agenda' + (AG_KOPPELING?.kalender_naam ? ' (' + esc(AG_KOPPELING.kalender_naam) + ')' : ''), x.extern.map(externCard).join(''))}
    ${blok('Logboek', x.log.map(entryCard).join(''))}
    ${als(!alles, leeg('Niets op deze dag.<br>Tik op <b>+ Inplannen</b> om een taak of afspraak in te plannen.'))}`;
}

const agPlan = id => AG_PLAN.find(p => p.id == id) || AG_OPEN.find(p => p.id == id);

$('#agDag').addEventListener('click', async ev => {
  if (ev.target.closest('.pdfbtn')) return;
  const k = s => ev.target.closest(`[data-${s}]`)?.dataset[s];
  if (ev.target.closest('#agPlanNieuw')) return openPlanning(null, {datum: AG_DAG});
  if (k('uitvoeren')) { const p = agPlan(k('uitvoeren')); return planUitvoeren(agTaak(p.task_id), p.id); }
  if (k('afvinken')) {
    const p = agPlan(k('afvinken'));
    try { await api('api/planning/' + p.id, json('PUT', {...p, afgevinkt: true})); toast('Afgevinkt'); await verversAlles(); }
    catch (e) { toast(e.message); }
    return;
  }
  if (k('inplannen')) return openPlanning(null, {datum: AG_DAG, task_id: +k('inplannen')});
  if (k('taakuit')) return taakUitgevoerd(agTaak(+k('taakuit')));
  const img = ev.target.closest('img[data-lb]');
  if (img) { const e = AG_ENTRIES.find(x => x.id == img.dataset.lb); return openLightbox(lbItems(e.fotos), +img.dataset.i); }
  const card = ev.target.closest('.card');
  if (!card) return;
  if (card.dataset.plan) openPlanning(agPlan(card.dataset.plan));
  else if (card.dataset.taak) openHistory(+card.dataset.taak);
  else openEntry(AG_ENTRIES.find(x => x.id == card.dataset.id));
});

// geplande taak uitvoeren: de logregel wordt aan dit planningspunt gekoppeld (planning_id); een stappenplan
// wordt op de server afgerond en rondt dan het oudste open punt van de taak af
const planUitvoeren = (t, pid) => t.stappen.length || lopend(t) ? openUitvoeren(t)
  : openEntry(null, {task_id: t.id, titel: t.naam, categorie: t.categorie, planning_id: pid});

// ---------------------------------------------------------------- dialoog
// openPlanning(punt) bewerkt; openPlanning(null, {datum, task_id}) plant nieuw (ook vanuit Taken)
function openPlanning(p = null, preset = {}) {
  agEditing = p;
  const f = $('#planForm'); f.reset();
  const v = p || {datum: today(), ...preset};
  $('#planTitle').textContent = p ? 'Planning bewerken' : 'Inplannen';
  $('#planDelete').hidden = !p;
  f.datum.value = v.datum || today();
  f.tijd.value = v.tijd || '';
  f.duur.value = durInput(v.duur_minuten);
  planDuurZichtbaar();
  f.task_id.value = v.task_id || '';
  if (v.task_id && f.task_id.value === '') {   // inactieve taak: toch tonen
    const t = agTaak(v.task_id);
    f.task_id.insertAdjacentHTML('beforeend', `<option value="${v.task_id}">${esc(t?.naam || p?.taak_naam || 'Taak')}</option>`);
    f.task_id.value = v.task_id;
  }
  f.titel.value = p && p.titel !== p.taak_naam ? p.titel : '';
  f.notitie.value = v.notitie || '';
  f.afgevinkt.checked = !!v.afgevinkt;
  $('#planAfvinken').hidden = !!p?.entry_id;
  $('#planGedaan').hidden = !p?.entry_id;
  $('#planGedaan').textContent = p?.entry_id ? `Afgerond met de logregel van ${fmtDate(p.entry_datum)}.` : '';
  planTitelHint();
  $('#planDlg').showModal();
}

function planTitelHint() {
  const f = $('#planForm');
  $('#planTitelHint').hidden = !f.task_id.value;
  f.titel.required = !f.task_id.value;
}
$('#planForm [name=task_id]').addEventListener('change', planTitelHint);

// duur alleen bij een tijd (zonder tijd is het een afspraak van een hele dag)
const planDuurZichtbaar = () => { $('#planDuur').hidden = !$('#planForm').tijd.value; };
$('#planForm [name=tijd]').addEventListener('input', planDuurZichtbaar);

$('#planForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target;
  const body = {datum: f.datum.value, tijd: f.tijd.value, duur: f.tijd.value ? f.duur.value : '',
    task_id: f.task_id.value ? +f.task_id.value : null, titel: f.titel.value, notitie: f.notitie.value, afgevinkt: f.afgevinkt.checked};
  try {
    await api(agEditing ? 'api/planning/' + agEditing.id : 'api/planning', json(agEditing ? 'PUT' : 'POST', body));
    $('#planDlg').close(); toast('Ingepland');
    AG_DAG = body.datum;
    const [j, m] = body.datum.split('-').map(Number); AG_MAAND = [j, m - 1];
    await verversAlles();
  } catch (e) { toast(e.message); }
});

$('#planDelete').addEventListener('click', async () => {
  if (!agEditing || !confirm('Dit planningspunt verwijderen?')) return;
  try {
    await api('api/planning/' + agEditing.id, {method: 'DELETE'});
    $('#planDlg').close(); toast('Verwijderd');
    await verversAlles();
  } catch (e) { toast(e.message); }
});

// ---------------------------------------------------------------- koppeling met de agenda (iCloud/Google)
function renderSync() {
  const k = AG_KOPPELING, el = $('#agSync');
  if (!k) return;
  $('#agLegExtern').hidden = !(k.account && k.kalender);
  if (!k.account || !k.kalender) {
    el.innerHTML = 'Koppel je iCloud- of Google-agenda via <a href="#" data-naar="settings">Instellingen › Agenda</a>.';
    return;
  }
  const st = k.status;
  el.innerHTML = `Gekoppeld met <b>${esc(k.kalender_naam || 'agenda')}</b>` +
    (st ? (st.ok ? ` · bijgewerkt ${fmtStamp(st.tijd)}` : ` · <span class="bad">synchroniseren mislukt: ${esc(st.fout)}</span>`) : '') +
    ' · <a href="#" id="agSyncNu">nu synchroniseren</a>';
}

let agSyncBezig = false;
async function syncAgenda(stil = false) {
  if (agSyncBezig) return;
  agSyncBezig = true;
  try {
    const k = await api('api/agenda/sync', {method: 'POST'});
    if (!stil) toast(k.status?.ok ? 'Agenda bijgewerkt' : 'Synchroniseren mislukt: ' + (k.status?.fout || ''));
    await laadAgenda();
  } catch (e) { if (!stil) toast(e.message); }
  finally { agSyncBezig = false; }
}

$('#agSync').addEventListener('click', ev => {
  if (ev.target.id === 'agSyncNu') { ev.preventDefault(); toast('Bezig met synchroniseren…'); syncAgenda(); }
  if (ev.target.dataset.naar) { ev.preventDefault(); show(ev.target.dataset.naar); }
});

