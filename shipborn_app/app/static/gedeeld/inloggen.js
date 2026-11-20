// Inloggen met naam + pincode (aan zodra er in Instellingen gebruikers zijn). De sessie (token in localStorage,
// meegestuurd als header X-Sessie door api()) verloopt na login_minutes (standaard 15) zonder wijziging; elke
// wijziging verlengt hem. Weg van de pagina en terugkomen binnen die tijd: geen nieuwe inlog nodig.
// Verlopen tijdens het invullen van een formulier: opslaan toont het inlogscherm en gaat daarna gewoon door.
const SESSIE = {token: null, gebruiker: null, verloopt: 0, inlog: false, gebruikers: [], minuten: 15};
let INLOG_WACHT = null;   // lopende inlogvraag: {promise, klaar}

const opslag = {
  get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
  zet: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} },
};
SESSIE.token = opslag.get('shipborn_sessie');

// door api() aangeroepen na elk antwoord met X-Sessie-Rest (resterende seconden)
function sessieRest(sec) {
  if (sec != null && sec !== '') SESSIE.verloopt = Date.now() + Number(sec) * 1000;
}

function zetSessie(token, gebruiker, rest) {
  SESSIE.token = token; SESSIE.gebruiker = gebruiker;
  opslag.zet('shipborn_sessie', token);
  if (gebruiker) opslag.zet('shipborn_naam', gebruiker);
  sessieRest(rest);
  toonWie();
}

function toonWie() {
  const w = $('#wie');
  w.hidden = !(SESSIE.inlog && SESSIE.gebruiker);
  w.textContent = SESSIE.gebruiker || '';
  w.title = SESSIE.gebruiker ? `Ingelogd als ${SESSIE.gebruiker} · tik om uit te loggen` : '';
}

// stand van de server ophalen (wie is ingelogd, hoe lang nog, welke gebruikers er zijn)
async function sessieLaden() {
  const s = await api('api/sessie');
  Object.assign(SESSIE, {inlog: s.inlog, gebruikers: s.gebruikers, minuten: s.minuten, gebruiker: s.gebruiker});
  if (!s.gebruiker && SESSIE.token) { SESSIE.token = null; opslag.zet('shipborn_sessie', null); }
  sessieRest(s.rest);
  toonWie();
  return s;
}

// toont het inlogscherm; de promise is klaar zodra iemand is ingelogd (of inloggen uit blijkt te staan)
function inloggen(melding = '') {
  if (INLOG_WACHT) return INLOG_WACHT.promise;
  let klaar;
  const promise = new Promise(r => { klaar = r; });
  INLOG_WACHT = {promise, klaar};
  const laatste = opslag.get('shipborn_naam');
  const kies = SESSIE.gebruikers.find(n => n === laatste) || (SESSIE.gebruikers.length === 1 ? SESSIE.gebruikers[0] : '');
  $('#inlogMelding').textContent = melding;
  $('#inlogMelding').hidden = !melding;
  $('#inlogFout').textContent = '';
  $('#inlogNamen').innerHTML = SESSIE.gebruikers.map(n =>
    `<label class="inlognaam"><input type="radio" name="naam" value="${esc(n)}"${n === kies ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('');
  $('#inlogPin').value = '';
  const dlg = $('#inlogDlg');
  if (!dlg.open) dlg.showModal();
  (kies ? $('#inlogPin') : $('#inlogNamen input'))?.focus();
  return promise;
}

function inlogKlaar() {
  if ($('#inlogDlg').open) $('#inlogDlg').close();
  INLOG_WACHT?.klaar();
  INLOG_WACHT = null;
}

$('#inlogDlg').addEventListener('cancel', ev => ev.preventDefault());   // niet wegdrukken met Esc
$('#inlogNamen').addEventListener('change', () => $('#inlogPin').focus());

$('#inlogForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const naam = $('#inlogForm input[name=naam]:checked')?.value;
  const fout = t => { $('#inlogFout').textContent = t; };
  if (!naam) return fout('Kies eerst je naam');
  const knop = $('#inlogForm button[type=submit]');
  knop.disabled = true;
  try {
    const r = await api('api/inloggen', json('POST', {naam, pin: $('#inlogPin').value}));
    zetSessie(r.token, r.gebruiker, r.rest);
    inlogKlaar();
    toast(`Ingelogd als ${r.gebruiker}`);
  } catch (e) {
    fout(e.message);
    $('#inlogPin').value = ''; $('#inlogPin').focus();
  } finally { knop.disabled = false; }
});

$('#wie').addEventListener('click', async () => {
  if (!confirm(`Uitloggen als ${SESSIE.gebruiker}?`)) return;
  try { await api('api/uitloggen', {method: 'POST'}); } catch (_) {}
  zetSessie(null, null);
  await sessieLaden();
  if (SESSIE.inlog) inloggen();
});

// bij het opstarten: inloggen vragen als dat aan staat en dit apparaat geen geldige sessie heeft
async function sessieStart() {
  await sessieLaden();
  if (SESSIE.inlog && !SESSIE.gebruiker) await inloggen();
  setInterval(sessieControle, 10000);
  // terug naar de pagina (ander tabblad, telefoon uit slaapstand): meteen controleren
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sessieControle(); });
}

// na de wachttijd zonder wijziging: eerst bij de server navragen (een andere tab kan hem verlengd hebben)
async function sessieControle() {
  if (!SESSIE.inlog || !SESSIE.gebruiker || INLOG_WACHT || Date.now() < SESSIE.verloopt) return;
  try {
    await sessieLaden();
    if (SESSIE.inlog && !SESSIE.gebruiker)
      inloggen(`Je hebt ${SESSIE.minuten} minuten niets gewijzigd en bent daarom uitgelogd.`);
  } catch (_) {}
}
