# Beslissingen

## 2026-10-26 – Logboek wordt een module van Shipborn App (0.14.0)
- **Eén HA-app met modules als hoofdmenu**, niet een repository met losse apps. Eén paneel, één database, één set opties; modules delen logo en instellingen.
- **Slug blijft `logboek`.** In Home Assistant hoort een slug bij een app, niet bij een tabblad; tabbladen hebben geen eigen slug. Een nieuwe slug (`shipborn`) installeert een nieuwe app met een lege `/data`, dus zonder migratie raak je de database kwijt. Met dezelfde slug is de omzetting een gewone update. Om dezelfde reden blijven `/share/logboek`, `logboek.db` en de MQTT-topics `logboek/...` gelijk. Overstappen op een andere slug kan later met een migratie (bijv. via de databasekopie in `/share/logboek/backup`).
- Wel aangepast: mapnaam `shipborn_app/`, `name` en `panel_title` "Shipborn App", paneelicoon `mdi:sail-boat`.
- Elke module krijgt een eigen weergave (`#view-…`) en eigen URL-hash (`#logboek/tasks`, `#reizen`) in plaats van een eigen slug.

## 2026-10-26 – Werkwijze met datummappen
- Elke sessie begint met een nieuwe kopie van de nieuwste datummap in `../jjmmdd` (bij meerdere sessies op één dag `jjmmdd_2`, …), gemaakt met `../nieuwe_sessie.ps1`. Oudere mappen blijven als archief staan.
- De datummappen zijn geen git-repository. GitHub (`Shipborn/ha-logboek`, main; sinds 1.0.0 `Shipborn/Shipborn_App`) wordt bijgewerkt door de inhoud van de nieuwste datummap volledig over de repo heen te zetten, als normale commit bovenop de bestaande geschiedenis (geen force-push).

## 2026-10-26 – Frontend per tabblad in losse bestanden (0.15.0)
- **Server-side samenstellen met Jinja** (zit al in Flask, geen nieuwe dependency, geen build-stap). Alternatief was HTML-fragmenten in de browser ophalen; dat geeft een extra laadstap en volgordeproblemen met event-handlers.
- **Gedeelde opmaak als Jinja-macro's** (`dialoog`, `voet`, `binnenkort`) en **JS-bouwstenen** in `ui.js`, zodat tabbladbestanden vooral hun eigen inhoud bevatten.
- **Gewone scripts i.p.v. ES-modules**: de bestaande code gebruikt functies over tabbladen heen (`openEntry`, `TASKS`); met gewone scripts blijft dat werken zonder alles om te bouwen. Nadeel: namen zijn globaal en moeten uniek zijn.
- Koppeling tussen tabbladen via `tabblad(...)`-hooks, `verversAlles()` en `op`/`meld`, zodat een tabblad niet meer in de DOM van een ander tabblad hoeft te schrijven.
- `static/*` met `Cache-Control: no-cache` plus `?v=<versie>`, zodat HA na een update geen oude bestanden toont.

## 2026-10-27 – Onderhoud, urentellers en stappenplannen (0.16.0)
- **Taken en Categorieën in de module Onderhoud** (wens gebruiker); Logboek = alleen logregels. Categorieën gelden nog steeds ook voor logregels.
- **Urentellers in de database (`meta`) in plaats van app-opties**, zodat ze in de app onder Instellingen staan en zonder herstart wijzigen. Vaste lijst `TELLERS` (hoofdmotor, generator) met eigen kolommen, geen vrije lijst motoren: de gebruiker wilde precies deze twee. Hoofdmotor houdt de oude kolommen (`motoruren`, `interval_uren`) zodat bestaande data en MQTT-sensoren blijven werken.
- **Een taak kan meerdere intervallen hebben** (dagen, hoofdmotor, generator); de eerste die bereikt wordt bepaalt de status (wens gebruiker).
- **Stappenplan wordt in de app zelf uitgevoerd**, niet als gegenereerd HA-script met browser_mod (zoals het voorbeeld in `voorbeeld/`): alleen in de app kunnen foto's gemaakt en verplicht worden. De functionaliteit van het script (stappen, uitleg, entiteiten bedienen, gates) is nagebouwd.
- **Gates als "vereiste status" per entiteit** (off/on/closed/open) in plaats van vrije Jinja-templates zoals in het script: eenvoudig in te stellen in de editor en zonder template-engine in de app.
- **Bedienen alleen voor entiteiten die in een stappenplan op 'bedienen' staan** en alleen voor schakelbare domeinen: het paneel is ook voor niet-beheerders, dus geen vrije toegang tot alle HA-services.
- **Afronden maakt automatisch een logregel** (wens gebruiker) via de bestaande `POST api/entries`; geen aparte tabel voor uitvoeringen.
- **Uitvoering alleen in de browser** tot Afronden (eenvoud). Vervangen in 1.1.0: uitvoeringen staan op de server.

## 2026-10-27 – Nieuwe app Shipborn App in eigen repository (1.0.0)
- **Nieuwe repository `Shipborn/Shipborn_App` en nieuwe slug `shipborn_app`** (wens gebruiker). Dit vervangt het besluit uit 0.14.0 om de slug `logboek` te houden: het is in HA nu een nieuwe app met een lege `/data`, dus de gegevens worden overgezet. De oude repository `Shipborn/ha-logboek` (0.16.0) blijft bestaan voor de oude installatie.
- **Opslag per soort en per maand** in `/share/shipborn` (`fotos/<jjjj>/<mm>`, `stappenplannen`, `backup`, `logo.png`), paden relatief in de database. Maand = moment van uploaden (niet de datum van de logregel), zodat een bestand niet verhuist als je de datum wijzigt.
- **Overzetten handmatig via een knop** (wens gebruiker: enige gebruiker, en er wordt ook van app gewisseld). Bron is de databasekopie die de oude app al in `/share/logboek/backup` bijhield; de nieuwe app kan niet in de `/data` van de oude. Kopiëren, niet verplaatsen: de oude app blijft werken tot hij verwijderd wordt.
- **Nieuwe MQTT-namen (`shipborn_…`)** (wens gebruiker): oude en nieuwe app botsen niet; automatiseringen op de oude sensoren moeten worden aangepast.
- Optie `engine_hours_entity` vervalt in de nieuwe app; urentellers staan in Instellingen.

## 2026-10-27 – Parallelle uitvoeringen (1.1.0)
- **Uitvoeringen op de server** (wens gebruiker): meerdere tegelijk, minimaliseren en wisselen, en ze overleven herladen (de HA-app op de telefoon herlaadt vaak) en zijn op een ander apparaat te hervatten. Foto's gaan direct naar `fotos/<jjjj>/<mm>`, zodat Afronden alleen de koppeling verplaatst.
- **Kopie van het stappenplan per uitvoering**: wijzigen van de taak tijdens een uitvoering verschuift de stappen niet.
- **Eén uitvoering per taak**: nogmaals Uitvoeren opent de lopende.
- **Taken zonder stappenplan** houden de gewone logregeldialoog (wens gebruiker), ook om achteraf een oude datum te loggen.
- **Duur = wandkloktijd** van start tot Afronden, ook als de uitvoering geminimaliseerd was; aan te passen in de logregel.
- **Overzet-functie verwijderd** (wens gebruiker): de overstap is gedaan en er zijn geen gebruikers meer op de oude app.

## 2026-10-27 – Taak kopiëren (1.2.0)
- **In de app in plaats van handmatig in de database** (wens gebruiker, na uitleg over `docker cp` van `/data/shipborn.db`): veiliger dan SQL op de live database.
- Kopiëren opent de taakdialoog met een ingevulde kopie (naam "Nieuwe taak") in plaats van direct op te slaan: je past hem meestal toch aan, en Annuleren laat geen ongewenste taak achter.
- Uitlegafbeeldingen worden **gedeeld** tussen origineel en kopie (geen bestanden kopiëren); opruimen gebeurt alleen voor bestanden die nergens meer gebruikt worden.

## 2026-11-05 – Agenda (1.3.0)
- **Eigen module Agenda** (hoofdmenu, tussen Onderhoud en Reizen) met maandkalender en daglijst eronder; het raster werkt ook op de telefoon (gekleurde balkjes i.p.v. tekst).
- **Aparte tabel `planning`** in plaats van een geplande datum op de taak: een taak kan meerdere keren gepland worden, en losse punten zonder taak (afspraken) zijn ook mogelijk. Bij verwijderen van een taak blijft het punt staan (titel is een kopie van de taaknaam).
- **Afronden via de logregel**: een nieuwe logregel bij de taak rondt het geplande punt af (het gekozen punt, anders het oudste open punt van die taak). Een uitvoering van een stappenplan krijgt geen `planning_id` mee (max. één per taak, dus het oudste open punt is vrijwel altijd het bedoelde). Wordt de logregel verwijderd, dan staat het punt weer open (`entry_id` → NULL). Losse punten worden afgevinkt.
- **Verwachte datum uit het interval** wordt alleen getoond (niet opgeslagen) en verdwijnt zodra de taak is ingepland; intervallen op uren hebben geen datum en staan niet in de agenda.
- Eerst per ongeluk gebouwd en gepusht in de oude repo `Shipborn/ha-logboek` (0.17.0); daarna overgezet naar deze app en daar teruggedraaid naar 0.16.0.

## 2026-11-06 – Agenda koppelen met iCloud/CalDAV en Google (1.4.0)
- Eerst gebouwd in `Shipborn/ha-logboek` (branch `agenda-google-icloud`) en daarna hier ingebouwd in de agenda van 1.3.0.
- **Rechtstreeks via CalDAV en de Google Calendar API** (keuze gebruiker) i.p.v. een ICS-abonnement (één richting, publieke URL nodig) of de agenda-integraties van HA (kunnen alleen aanmaken, niet wijzigen/verwijderen). Google via de API i.p.v. Google-CalDAV (alleen If-Match, vraagt sync-collection).
- **Eigen kleine CalDAV-client** (requests + ElementTree): de `caldav`-bibliotheek vraagt `lxml`, lastig op Alpine/armv7. Wel `icalendar` en `recurring-ical-events` (pure Python).
- **Eén vorm voor beide diensten** (`kalender.py`), zodat de sync-logica één keer bestaat. Planning twee richtingen (bij een wijziging aan beide kanten wint de app; in de agenda verwijderd = ook in de app weg), logregels alleen app → agenda (een registratie wijzig je in de app). Bijwerken op basis van de bestaande afspraak, zodat herinneringen blijven.
- **Planning kreeg tijd en duur**: anders zou een tijd die op de telefoon wordt ingesteld bij de volgende wijziging in de app verloren gaan. `updated_at` in microseconden: met seconden werden wijzigingen vlak na een sync gemist.
- **Inloggegevens als app-opties en het Google-token in `/data`**, niet in de database: die wordt naar `/share` gekopieerd en is daar ook voor andere apps en Samba leesbaar.
- **Google: eigen OAuth-client van de gebruiker en het localhost-adres terugplakken**. De device flow staat de agenda-scope niet toe, en een vaste redirect naar de app kan niet (het ingress-adres verandert per sessie). De gebruiker moet het toestemmingsscherm op In productie zetten, anders verloopt de koppeling na 7 dagen.
- **Taken die aan de beurt zijn ook naar de agenda** (wens gebruiker), één richting en aan/uit te zetten: te laat of zonder datum → vandaag, anders de datum volgens het interval. Wijzigingen worden herkend aan een hash van de inhoud (er is geen wijzigingstijd). Verplaatsen op de telefoon wordt overschreven: een vaste datum geef je door in te plannen.
- **Vaste datum in de taakdialoog** stuurt het eerstvolgende open geplande punt van de taak aan (geen extra kolom op de taak): zo blijft er één bron voor geplande datums.

## 2026-11-20 – Systemen bundelen categorieën (1.5.0)
- **Systeem als groep boven de categorie** (wens gebruiker), één niveau diep: een categorie hoort bij hoogstens één systeem (`categories.systeem_id`). Geen veel-op-veel en geen geneste systemen: eenvoudig te beheren en genoeg voor "Koelwater: pomp, impeller, …".
- **Logregels en taken blijven aan de categorie gekoppeld** (bestaande kolom met de naam); het systeem wordt afgeleid. Daardoor verandert er niets aan bestaande data, sync, PDF, MQTT en dagmail, en verhuist een categorie met al haar logregels als je haar in een ander systeem zet.
- **Systeem verwijderen laat de categorieën staan** (zonder systeem), net zoals een categorie verwijderen de logregels laat staan.
- Beheer in het bestaande tabblad Categorieën (systemen als kop, categorieën eronder), niet in een apart tabblad.

## 2026-11-20 – Inloggen in de app (1.6.0)
- **Eigen gebruikers met naam + pincode** naast het HA-account (wens gebruiker: bijhouden wie iets invoert, ook als meerdere mensen één HA-account/tablet delen). Pincode in plaats van wachtwoord: snel op een tablet aan boord; pbkdf2 met salt en na 5 fouten 30 s wachten.
- **Aan zodra er een gebruiker is**: bestaande installaties werken na de update zoals voorheen; de eerste gebruiker is meteen ingelogd, zodat je jezelf niet buitensluit. Noodknop: optie `login_reset`.
- **Sessie verloopt na 15 min zonder wijziging** (wens gebruiker), niet zonder activiteit: alleen POST/PUT/DELETE verlengen. Token in `localStorage`, zodat weg en terug (ander HA-paneel, iframe herladen) binnen die tijd geen nieuwe inlog vraagt.
- **Alleen wijzigingen worden op de server afgedwongen**; lezen (GET) niet, want PDF-, CSV- en fotolinks kunnen geen header meesturen en de app is al alleen via HA (ingress) bereikbaar. Het inlogscherm dekt de pagina wel af.
- **Verlopen tijdens invullen verliest niets**: `api()` toont bij 401 het inlogscherm en stuurt daarna hetzelfde verzoek opnieuw.
- (1.6.1) **Alleen de app-gebruiker telt** (wens gebruiker): `current_user()` valt niet meer terug op de HA-gebruiker uit de ingress-headers. Zonder gebruikers blijft "ingevoerd door" leeg. "Uitgevoerd door" is standaard de ingelogde gebruiker.

## 2026-11-25 – Nog te doen en opvolging (1.7.0)
- **Punt zonder datum = planning met `datum` NULL** (wens gebruiker: punten maken zonder datum en die later inplannen), geen aparte tabel: inplannen is dan alleen een datum invullen, en afvinken, taakkoppeling en de logregel-koppeling werken zoals bij geplande punten. Kostte een omzetting van de tabel (SQLite kan NOT NULL niet weghalen).
- **Opvolging = planningspunt met `bron_entry_id`**, met of zonder datum (wens gebruiker). Een logregel kan meerdere opvolgingen hebben; verwijderen van de logregel laat de opvolging staan (het werk moet nog steeds gebeuren).
- **Zonder datum niet naar iCloud/Google** (een afspraak heeft een datum nodig); de lijst staat alleen in de app.
- De oude lijst "Te doen" bij vandaag (taken die aan de beurt zijn) heet nu **Onderhoud aan de beurt**, om verwarring met **Nog te doen** te voorkomen.

## 2026-11-27 – Pagina per categorie en systeem (1.8.0)
- **Pagina in het tabblad Categorieën, geen dialoog of nieuw tabblad** (wens gebruiker: "een pagina" per categorie en per systeem): de oude logregeldialoog is opgegaan in de categoriepagina. Adres in de hash (`#onderhoud/cats/cat/<id>`), zodat herladen en de terugknop van telefoon/browser werken; daarvoor kreeg `show()` een extra pad en `ga()` (pushState).
- **Documenten per categorie in een eigen tabel**, los van de foto's van logregels: ze horen bij het onderdeel, niet bij een uitgevoerde klus. Foto's en PDF's in één lijst (veel documentatie is PDF). PDF's ongewijzigd opgeslagen (herkend aan de `%PDF-`-kop, niet aan de extensie); geen voorbeeldafbeelding van PDF's (geen extra pakket in de container).
- **Onderdelen als vrije velden** (aantal is tekst: "2", "1 set"), geen voorraadbeheer of koppeling met taken; uit te breiden als dat nodig blijkt.
- Categorie verwijderen verwijdert haar documenten en onderdelen (logregels en taken blijven, zoals voorheen).

