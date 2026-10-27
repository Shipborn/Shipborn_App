// Instellingen: urentellers (hoofdmotor, generator), overzetten uit de oude Logboek-app en logo
// (ook in de kop van de app, in elke PDF en in de dagmail).
tabblad('settings', {
  config: () => showLogo(),
  toon: () => { loadUren(); loadOverzetten(); },
});

// ---------------------------------------------------------------- overzetten uit de oude app
async function loadOverzetten() {
  const {oud, leeg} = await api('api/overzetten');
  $('#overzetten').hidden = !oud;
  if (!oud) return;
  $('#overzetInfo').innerHTML = `<p>Gevonden in <code>${esc(oud.pad)}</code> (bijgewerkt ${fmtStamp(oud.bijgewerkt)}):
    ${meervoud(oud.logregels, 'logregel', 'logregels')}, ${meervoud(oud.taken, 'taak', 'taken')},
    ${meervoud(oud.categorieen, 'categorie', 'categorieën')}, ${meervoud(oud.fotos, 'foto', "foto's")}.</p>
    ${als(!leeg, '<p class="hint">Deze app heeft al eigen logregels of taken. Overzetten vervangt die.</p>')}`;
  $('#overzetVervangen').hidden = leeg;
  $('#overzetVervangen input').checked = false;
}

$('#overzetKnop').addEventListener('click', async () => {
  const vervangen = $('#overzetVervangen input').checked;
  if (!$('#overzetVervangen').hidden && !vervangen) { toast('Vink eerst aan dat de huidige gegevens vervangen mogen worden'); return; }
  if (!confirm('Gegevens uit de oude Logboek-app overzetten?')) return;
  const knop = $('#overzetKnop'); knop.disabled = true; knop.textContent = 'Bezig…';
  try {
    const r = await api('api/overzetten', json('POST', {vervangen}));
    toast(`Overgezet: ${meervoud(r.logregels, 'logregel', 'logregels')}, ${meervoud(r.taken, 'taak', 'taken')}, ` +
      `${meervoud(r.gekopieerd, 'bestand', 'bestanden')}` + (r.ontbreekt ? ` (${r.ontbreekt} niet gevonden)` : ''));
    await loadConfig();
    await verversAlles();
    loadOverzetten(); loadUren();
  } catch (e) { toast(e.message); }
  finally { knop.disabled = false; knop.textContent = 'Overzetten'; }
});

// ---------------------------------------------------------------- urentellers
async function loadUren() {
  const {tellers} = await api('api/instellingen');
  $('#urenRijen').innerHTML = tellers.map(t => `
    <div class="urenrij">
      <b>${esc(t.naam)}</b>
      <input name="${t.id}" list="haEntities" value="${esc(t.entiteit || '')}" placeholder="bijv. sensor.${t.id}_uren" autocomplete="off">
      <span class="stand">${t.entiteit ? (t.waarde != null ? `nu <b>${fmtNum(t.waarde)} u</b>` : 'geen getal') : 'niet ingesteld'}</span>
    </div>`).join('');
  loadHaEntities();
}

$('#urenForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const tellers = Object.fromEntries($$('#urenRijen input').map(i => [i.name, i.value.trim()]));
  try {
    await api('api/instellingen', json('PUT', {tellers}));
    toast('Urentellers opgeslagen');
    await Promise.all([loadUren(), loadConfig()]);
    await verversAlles();
  } catch (e) { toast(e.message); }
});

// ---------------------------------------------------------------- logo
function showLogo() {
  const src = CFG.logo ? 'logo.png?v=' + CFG.logo : null;
  $('#logo').hidden = !src; if (src) $('#logo').src = src;
  $('#logoPrev').innerHTML = src ? `<img src="${src}" alt="Logo">` : '<span class="hint">Nog geen logo</span>';
  $('#logoDel').hidden = !src;
}

$('#logoInput').addEventListener('change', async ev => {
  const file = ev.target.files[0]; ev.target.value = '';
  if (!file) return;
  const fd = new FormData(); fd.append('logo', file);
  try { CFG.logo = (await api('api/logo', {method: 'POST', body: fd})).logo; showLogo(); toast('Logo opgeslagen'); }
  catch (e) { toast(e.message); }
});

$('#logoDel').addEventListener('click', async () => {
  if (!confirm('Logo verwijderen?')) return;
  try { await api('api/logo', {method: 'DELETE'}); CFG.logo = null; showLogo(); toast('Logo verwijderd'); }
  catch (e) { toast(e.message); }
});
