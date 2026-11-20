# Status

**Versie 1.6.1**, op GitHub (`main`, 2026-11-20) en in Dropbox-werkmap `261120` (= `main` + `voorbeeld/`; `261106` is 1.4.0).

## Stand van GitHub (`Shipborn/Shipborn_App`)
- `main` = **1.6.1** (inloggen; alleen app-gebruiker vastgelegd, 2026-11-20); 1.5.0 = systemen; 1.4.0 = PR #1, merge-commit `b77a620`, = de inhoud van `261106` zonder `voorbeeld/`. 1.3.0–1.6.1 zijn gemaakt in een git-checkout (`~/Projects/Shipborn_App` op de Mac) en daarna als datummap in Dropbox gezet (op de Mac: `~/SHIPborn B.V. Dropbox/Shipborn/Shipborn_APP/01.SourceCode`).
- `Shipborn/ha-logboek` blijft op 0.16.0. Daar staat nog een gepushte branch `agenda-google-icloud` (eerste versie van de koppeling, per ongeluk in die repo): mag weg, wacht op akkoord van de gebruiker.

## Gedaan
- 0.14.0–0.16.0 (in `Shipborn/ha-logboek`): modules, frontend per tabblad, Onderhoud-module met urentellers en stappenplannen.
- 1.0.0: nieuwe app `shipborn_app` in `Shipborn/Shipborn_App`, opslag per soort en per maand in `/share/shipborn`. De gebruiker heeft de overstap in HA gedaan.
- 1.1.0: **parallelle uitvoeringen** van stappenplannen (minimaliseren naar een balk, alles op de server). Overzet-functie verwijderd.
- 1.2.0: **taak kopiëren** (uitlegafbeeldingen gedeeld, pas opgeruimd als niets ze meer gebruikt).
- 1.3.0: module **Agenda**: maandkalender met logregels, geplande taken/losse punten en verwachte datums; inplannen, afvinken, uitvoeren vanuit de agenda.
- 1.4.0:
  - **Koppeling met iCloud/CalDAV of Google Agenda** (Instellingen › Agenda): ingeplande punten in twee richtingen, logregels optioneel één richting, overige afspraken zichtbaar in de agenda. Planning heeft tijd en duur.
  - **Te doen**: niet-ingeplande taken die te laat zijn of zonder datum aan de beurt (nooit gelogd, interval in uren) staan bij vandaag; ze gaan (standaard aan) ook als "Onderhoud: …" naar iCloud/Google.
  - **Ingepland op** (datum + tijd) in de taakdialoog: maakt/verzet/verwijdert het eerstvolgende geplande punt.
  - Getest met Radicale (CalDAV) en `tools/nep_google.py`: omzetting van een 1.3.0-database, versturen, afvinken, wijzigen/verwijderen in de agenda, uitvoeren, Google koppelen/ontkoppelen, verlopen token, taken naar de agenda, vaste datum. In de browser: agenda, planningsdialoog, taakdialoog, Instellingen.
- 1.5.0: **Systemen** bundelen categorieën: beheer in Onderhoud › Categorieën (systeem als kop, categorieën eronder, ✎ om een categorie te verplaatsen), dialoog en PDF per systeem, keuzelijsten per systeem gegroepeerd, logboekfilter op een heel systeem, "Systeem › Categorie" bij logregels/taken/agenda, CSV-kolom Systeem. Lokaal getest (nieuwe database met de standaardcategorieën): toevoegen, dubbele naam, verplaatsen, volgorde binnen groep en van systemen, verwijderen, filter, dialoog, PDF, CSV, telefoonbreedte; omzetting van een 1.4.0-database (kolom `systeem_id` erbij, data blijft, twee keer starten gaat goed).
- 1.6.0: **Inloggen** met naam + pincode (Instellingen › Gebruikers); aan zodra er een gebruiker is. Wie iets invoert/wijzigt wordt de ingelogde gebruiker. Na 15 min (optie `login_minutes`) zonder wijziging opnieuw inloggen; verlopen tijdens invullen → inloggen en daarna toch opgeslagen. Noodknop `login_reset`. 1.6.1: alleen de app-gebruiker wordt vastgelegd (niet meer de HA-gebruiker), "Uitgevoerd door" standaard de ingelogde gebruiker, ook bij afronden van een stappenplan. Lokaal getest (met `login_minutes: 1`): eerste gebruiker meteen ingelogd, herladen blijft ingelogd, verlopen → inlogscherm, verkeerde pincode, blokkade na 5 fouten, opslaan na opnieuw inloggen (logregel "door Piet"), pincode wijzigen, laatste gebruiker weg → inloggen uit, `login_reset`, telefoonbreedte.

## Niet gedaan / niet getest
- 1.4.0 **niet getest met echte iCloud/Google, niet in HA en niet in de Docker-build** (nieuwe pakketten `icalendar`, `recurring-ical-events`). Bij Google aangenomen (alleen nep-server): `events/import` zet een eerder verwijderde afspraak terug; PATCH met `null` voor date/dateTime wisselt tussen hele dag en tijd.
- Google vraagt een eigen OAuth-client van de gebruiker (stappen in DOCS.md en in de app); het toestemmingsscherm moet op "In productie", anders verloopt de koppeling na 7 dagen.
- Agenda: geen herhalende planning, geen meerdaagse planning, slepen niet mogelijk; verschuiven van een "Onderhoud: …"-afspraak op de telefoon wordt door de app teruggezet (vaste datum = inplannen).
- 1.1.0–1.3.0 niet getest op Android (camera in de pagina bij uitvoeren, balk in de HA-app).
- Twee apparaten tegelijk in dezelfde uitvoering: laatste schrijfactie wint. Duur = wandkloktijd van start tot afronden.
- Het stappenplan staat niet in de taak-PDF; geüploade maar nooit opgeslagen uitlegafbeeldingen blijven als wees staan.
- Systemen (1.5.0): niet in HA getest; systemen staan (nog) niet in de taak- of logregel-PDF, de dagmail en de agenda-sync.
- Inloggen (1.6.0): niet getest in HA (ingress, Android-app, localStorage in de HA-webview); lezen is niet afgeschermd op de server (alleen het scherm); geen rechtenverschil tussen gebruikers.
- Module Reizen is nog een lege placeholder. `voorbeeld/` alleen in de werkmap; niet publiceren.

## Volgende stappen
1. Gebruiker: in HA bijwerken naar 1.4.0 (staat op main).
2. In HA: iCloud (Apple ID + app-specifiek wachtwoord) of Google (eigen OAuth-client) instellen, kalender kiezen en controleren: punten verschijnen, verschuiven op de telefoon komt terug, "Onderhoud: …" voor open taken.
3. Branch `agenda-google-icloud` in `Shipborn/ha-logboek` verwijderen (na akkoord).
4. Open vragen: stappenplan in de taak-PDF? Bestede tijd alleen tellen als de uitvoering open is? Inhoud van Reizen? Git i.p.v. datummappen (1.3.0/1.4.0 zijn al in git gemaakt)?
