// Onderhoud › Taken › Uitvoeren: stap voor stap door het stappenplan van een taak, met uitleg, afbeeldingen,
// Home Assistant-entiteiten (status, bedienen, voorwaarde voor Volgende) en uitvoeringsfoto's.
// Uitvoeringen staan op de server (api/uitvoeringen): elke stap, opmerking en foto wordt direct opgeslagen.
// Er kunnen er meerdere tegelijk lopen; geminimaliseerde staan in de balk onderin (#runDock), in het venster
// wissel je via de knoppen bovenaan (#procWissel). Afronden maakt op de server een logregel bij de taak.
let RUNS = [], PROC = null, procTimer = null, notitieTimer = null, procBezig = false, procStates = {};
const VEREIST_TEKST = {off: 'uit', on: 'aan', closed: 'dicht', open: 'open'};
const WAARDE_TEKST = {on: 'aan', off: 'uit', open: 'open', closed: 'dicht', opening: 'gaat open', closing: 'gaat dicht',
  unavailable: 'niet beschikbaar', unknown: 'onbekend'};
const KNOP_TEKST = {valve: ['Open', 'Dicht'], cover: ['Open', 'Dicht']};   // overige domeinen: Aan / Uit

if (HA_ANDROID) $('#procFile').removeAttribute('multiple');

// lopende uitvoeringen laden bij het opstarten en na elke wijziging in de app
tabblad('uitvoeren', {
  laden: () => laadRuns(),
  ververs: () => laadRuns(),
});

async function laadRuns() {
  RUNS = await api('api/uitvoeringen');
  if (PROC) {   // open venster: lokale stand (bijv. een opmerking die nog getypt wordt) houden
    const nieuw = RUNS.find(r => r.id === PROC.id);
    if (!nieuw) { toast(`"${PROC.taak}" is elders afgerond of afgebroken`); sluitProc(); }
    else RUNS[RUNS.indexOf(nieuw)] = PROC;
  }
  renderDock();
  meld('uitvoeringen', RUNS);
}

const runLabel = r => `${r.stap + 1}/${r.stappen.length}`;

function renderDock() {
  const dock = $('#runDock'), lijst = RUNS.filter(r => r !== PROC);
  dock.hidden = !lijst.length;
  document.body.classList.toggle('met-dock', !!lijst.length);
  dock.innerHTML = lijst.map(r => `<button type="button" data-run="${r.id}" title="Verder met ${esc(r.taak)}">
    <span>▶</span><span class="t">${esc(r.taak)}</span><span class="n">stap ${runLabel(r)}</span></button>`).join('');
}
$('#runDock').addEventListener('click', ev => { const b = ev.target.closest('[data-run]'); if (b) openRun(+b.dataset.run); });

// ---------------------------------------------------------------- openen, wisselen, minimaliseren
// openUitvoeren(taak): loopt er al een voor deze taak, dan verder daarmee; anders een nieuwe starten
async function openUitvoeren(t) {
  let r = RUNS.find(x => x.task_id === t.id);
  if (!r) {
    try { r = await api('api/uitvoeringen', json('POST', {task_id: t.id})); }
    catch (e) { toast(e.message); return; }
    RUNS.push(r); meld('uitvoeringen', RUNS);
  }
  openRun(r.id);
}

async function openRun(id) {
  await bewaarNotities();
  PROC = RUNS.find(r => r.id === id);
  if (!PROC) return;
  procStates = {};
  renderProc();
  if (!$('#procDlg').open) $('#procDlg').showModal();
  renderDock();
  pollStates();
  clearInterval(procTimer); procTimer = setInterval(pollStates, 3000);
}

function sluitProc() {
  clearInterval(procTimer); PROC = null;
  if ($('#procDlg').open) $('#procDlg').close();
  renderDock();
  meld('uitvoeringen', RUNS);   // taakkaarten tonen de actuele stap
}
async function minimaliseer() { await bewaarNotities(); sluitProc(); }

$('#procMin').addEventListener('click', minimaliseer);
$('#procDlg').addEventListener('cancel', ev => { ev.preventDefault(); minimaliseer(); });   // Esc = minimaliseren
$('#procWissel').addEventListener('click', ev => { const b = ev.target.closest('[data-run]'); if (b) openRun(+b.dataset.run); });

$('#procAfbreken').addEventListener('click', async () => {
  const iets = PROC.fotos.length || PROC.notities.some(n => n.trim());
  if (!confirm(`Uitvoering van "${PROC.taak}" afbreken?` + (iets ? "\nGemaakte foto's en opmerkingen gaan verloren." : ''))) return;
  try {
    await api(`api/uitvoeringen/${PROC.id}`, {method: 'DELETE'});
    RUNS = RUNS.filter(r => r !== PROC);
    sluitProc(); toast('Uitvoering afgebroken');
  } catch (e) { toast(e.message); }
});

// ---------------------------------------------------------------- weergave
const procStap = () => PROC.stappen[PROC.stap];
const stapFotos = () => PROC.fotos.filter(f => f.stap === PROC.stap);

function renderProc() {
  const s = procStap(), n = PROC.stappen.length, i = PROC.stap;
  $('#procTitle').textContent = PROC.taak;
  $('#procStap').textContent = `stap ${i + 1} van ${n}`;
  $('#procWissel').hidden = RUNS.length < 2;
  $('#procWissel').innerHTML = RUNS.map(r => `<button type="button" data-run="${r.id}"${r === PROC ? ' class="nu"' : ''}>
    ${esc(r.taak)} · ${runLabel(r)}</button>`).join('');
  $('#procBody').innerHTML = `
    <div class="procvoortgang">${PROC.stappen.map((_, j) => `<span class="${j < i ? 'klaar' : j === i ? 'nu' : ''}"></span>`).join('')}</div>
    <h3 class="proctitel">${i + 1}. ${esc(s.titel)}</h3>
    ${als(s.tekst, `<div class="uitleg">${mdHtml(s.tekst)}</div>`)}
    ${als(s.afbeeldingen.length, `<div class="thumbs procimgs">${s.afbeeldingen.map((a, j) =>
      `<img src="photos/${a.thumb}" data-uitleg="${j}" alt="Afbeelding ${j + 1}">`).join('')}</div>`)}
    ${als(s.entiteiten.length, '<div class="procents" id="procEnts"></div><div id="procGate"></div>')}
    ${als(s.fotos !== 'geen', `<div class="procfoto">
      <label>${esc(s.foto_vraag || "Foto's van de uitvoering")}
        <span class="hint">(${s.fotos === 'verplicht' ? `verplicht, minimaal ${s.min_fotos}` : 'optioneel'})</span></label>
      <div class="photos" id="procFotos"></div><p class="hint" id="procTekort" hidden></p></div>`)}
    <label class="procnotitie">Opmerking bij deze stap <span class="hint">(optioneel, komt in de logregel)</span>
      <textarea id="procNotitie" rows="2">${esc(PROC.notities[i])}</textarea></label>`;
  $('#procTerug').hidden = i === 0;
  $('#procVerder').textContent = i === n - 1 ? 'Afronden ✓' : 'Volgende ›';
  if (s.entiteiten.length) renderProcEnts();
  if (s.fotos !== 'geen') renderProcFotos();
  knoppenBijwerken();
}

const waardeTekst = st => st ? (WAARDE_TEKST[st.waarde] || st.waarde) + (st.eenheid ? ' ' + st.eenheid : '') : '…';
const entNaam = e => e.naam || procStates[e.entity_id]?.naam || e.entity_id;

// voorwaarden van deze stap die nog niet kloppen
const gateMis = () => procStap().entiteiten.filter(e => e.vereist && procStates[e.entity_id]?.waarde !== e.vereist)
  .map(e => `${entNaam(e)} moet ${VEREIST_TEKST[e.vereist] || e.vereist} zijn`);

function renderProcEnts() {
  const s = procStap();
  if (!$('#procEnts')) return;
  $('#procEnts').innerHTML = s.entiteiten.map((e, j) => {
    const st = procStates[e.entity_id];
    const ok = !e.vereist || st?.waarde === e.vereist;
    const [aan, uit] = KNOP_TEKST[e.entity_id.split('.')[0]] || ['Aan', 'Uit'];
    return `<div class="procent${e.vereist ? (ok ? ' ok' : ' nok') : ''}">
      <div class="grow"><b>${esc(entNaam(e))}</b><span class="hint">${esc(e.entity_id)}</span></div>
      <span class="chip">${esc(waardeTekst(st))}</span>
      ${als(e.bedienen, `<button type="button" class="btn" data-bedien="${j}" data-aan="1">${aan}</button>
        <button type="button" class="btn" data-bedien="${j}" data-aan="0">${uit}</button>`)}
    </div>`;
  }).join('');
  const mis = gateMis();
  $('#procGate').innerHTML = !s.entiteiten.some(e => e.vereist) ? ''
    : mis.length ? `<div class="alert bad">❌ Nog niet gereed${mis.map(m => '<br>• ' + esc(m)).join('')}</div>`
    : '<div class="alert good">✅ Gereed – u kunt door naar de volgende stap</div>';
  knoppenBijwerken();
}

function renderProcFotos() {
  if (!$('#procFotos')) return;
  const busy = procBezig ? ' busy' : '';
  $('#procFotos').innerHTML = stapFotos().map((f, j) =>
    `<div class="ph"><img src="photos/${f.thumb}" data-pf="${j}" alt=""><button type="button" data-pfdel="${f.id}" aria-label="Foto weghalen">×</button></div>`).join('') +
    `<label class="addph${busy}" for="procCam"><span>📷</span>Foto maken</label>` +
    `<label class="addph${busy}" for="procFile"><span>🖼️</span>${procBezig ? 'Bezig…' : 'Uit galerij'}</label>`;
  knoppenBijwerken();
}

// Volgende/Afronden alleen als de voorwaarden kloppen en er genoeg foto's zijn
function knoppenBijwerken() {
  const s = procStap(), mis = gateMis();
  const tekort = s.fotos === 'verplicht' ? Math.max(0, s.min_fotos - stapFotos().length) : 0;
  $('#procVerder').disabled = !!(tekort || mis.length || procBezig);
  const t = $('#procTekort');
  if (t) { t.hidden = !tekort; t.textContent = `Nog ${meervoud(tekort, 'foto', "foto's")} nodig om verder te gaan.`; }
}

// ---------------------------------------------------------------- Home Assistant
async function pollStates() {
  const run = PROC, ids = run && procStap().entiteiten.map(e => e.entity_id);
  if (!ids?.length) return;
  try {
    const states = await api('api/ha/states?ids=' + ids.join(','));
    if (PROC !== run) return;   // intussen gewisseld of geminimaliseerd
    Object.assign(procStates, states);
    renderProcEnts();
  } catch (_) {}
}

async function bedien(knop) {
  const e = procStap().entiteiten[+knop.dataset.bedien];
  knop.disabled = true;
  try {
    const st = await api('api/ha/bedien', json('POST', {entity_id: e.entity_id, aan: knop.dataset.aan === '1'}));
    if (st) procStates[e.entity_id] = st;
    renderProcEnts();
    setTimeout(pollStates, 1500);   // kleppen en pompen hebben soms even nodig
  } catch (err) { toast(err.message); knop.disabled = false; }
}

// ---------------------------------------------------------------- opmerkingen en foto's (direct naar de server)
async function bewaarNotities() {
  clearTimeout(notitieTimer);
  if (!PROC?.notitiesGewijzigd) return;
  PROC.notitiesGewijzigd = false;
  try { await api(`api/uitvoeringen/${PROC.id}`, json('PUT', {notities: PROC.notities})); }
  catch (e) { toast('Opmerking niet opgeslagen: ' + e.message); }
}
$('#procBody').addEventListener('input', ev => {
  if (ev.target.id !== 'procNotitie') return;
  PROC.notities[PROC.stap] = ev.target.value; PROC.notitiesGewijzigd = true;
  clearTimeout(notitieTimer); notitieTimer = setTimeout(bewaarNotities, 800);
});

async function procAddFiles(files) {
  if (!files.length) return;
  const run = PROC, stap = run.stap;
  procBezig = true; renderProcFotos();
  try {
    for (const f of files) {
      const fd = new FormData();
      fd.append('foto', await shrinkPhoto(f)); fd.append('stap', stap);
      run.fotos.push(await api(`api/uitvoeringen/${run.id}/fotos`, {method: 'POST', body: fd}));
    }
  } catch (e) { toast(e.message); }
  finally { procBezig = false; if (PROC) renderProcFotos(); }
}
const procFotoGekozen = ev => { const files = [...ev.target.files]; ev.target.value = ''; procAddFiles(files); };
$('#procCam').addEventListener('change', procFotoGekozen);
$('#procFile').addEventListener('change', procFotoGekozen);
// in de HA Android-app opent Foto maken de camera in de pagina
$('#procBody').addEventListener('click', ev => {
  if (IN_PAGE_CAMERA && ev.target.closest('label[for="procCam"]')) { ev.preventDefault(); openCamera(f => procAddFiles([f])); }
}, true);

$('#procBody').addEventListener('click', async ev => {
  const t = ev.target, s = procStap();
  const knop = t.closest('[data-bedien]');
  if (knop) { bedien(knop); return; }
  if (t.dataset.uitleg != null) openLightbox(s.afbeeldingen.map(a => ({src: 'photos/' + a.bestand})), +t.dataset.uitleg);
  if (t.dataset.pf != null) openLightbox(stapFotos().map(f => ({src: 'photos/' + f.bestand})), +t.dataset.pf);
  if (t.dataset.pfdel != null) {
    if (!confirm('Deze foto weghalen?')) return;
    try {
      await api(`api/uitvoeringen/${PROC.id}/fotos/${t.dataset.pfdel}`, {method: 'DELETE'});
      PROC.fotos = PROC.fotos.filter(f => f.id != t.dataset.pfdel); renderProcFotos();
    } catch (e) { toast(e.message); }
  }
});

// ---------------------------------------------------------------- navigatie en afronden
async function naarStap(i) {
  await bewaarNotities();
  PROC.stap = i; procStates = {};
  renderProc(); $('#procBody').scrollTop = 0; pollStates();
  api(`api/uitvoeringen/${PROC.id}`, json('PUT', {stap: i})).catch(e => toast(e.message));
}
$('#procTerug').addEventListener('click', () => naarStap(PROC.stap - 1));
$('#procVerder').addEventListener('click', () => PROC.stap < PROC.stappen.length - 1 ? naarStap(PROC.stap + 1) : afronden());

async function afronden() {
  const knop = $('#procVerder'), run = PROC;
  knop.disabled = true; knop.textContent = 'Opslaan…';
  try {
    await bewaarNotities();
    await api(`api/uitvoeringen/${run.id}/afronden`, {method: 'POST'});
    RUNS = RUNS.filter(r => r !== run);
    sluitProc();
    toast(`"${run.taak}" afgerond en gelogd`);
    await verversAlles();
  } catch (e) { toast(e.message); knop.disabled = false; knop.textContent = 'Afronden ✓'; }
}
