# Status

**Versie 1.4.0**, werkmap `261106` (nieuwste, 2026-11-06). Werk gepauzeerd; een volgende sessie (ook op een andere computer) begint met `../nieuwe_sessie.ps1` en leest `../CLAUDE.md` en `CLAUDE.md`.

## Stand van GitHub (`Shipborn/Shipborn_App`) — let op, loopt achter op de werkmap
- `main` = **1.3.0** (commit `b32c41e`, plus `53c4db3` alleen STATUS). 1.3.0 en 1.4.0 zijn gemaakt in een git-checkout (`~/Projects/Shipborn_App` op de Mac) en niet in een datummap; `261106` bevat nu alles.
- Branch `agenda-koppeling` met commit `50ea69c` (1.4.0, eerste deel) en **PR #1** naar main (open, niet samengevoegd).
- **Nog niet in git:** het tweede deel van 1.4.0 ("Te doen", taken naar de agenda, "Ingepland op" in de taakdialoog) en de documentatie die na 1.2.0 alleen in `261027_2` was aangepast (nu samengevoegd). Bij publiceren: inhoud van `261106` op de branch `agenda-koppeling` (of op main als de PR eerst wordt samengevoegd) zetten, zonder `voorbeeld/`.
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

## Niet gedaan / niet getest
- 1.4.0 **niet getest met echte iCloud/Google, niet in HA en niet in de Docker-build** (nieuwe pakketten `icalendar`, `recurring-ical-events`). Bij Google aangenomen (alleen nep-server): `events/import` zet een eerder verwijderde afspraak terug; PATCH met `null` voor date/dateTime wisselt tussen hele dag en tijd.
- Google vraagt een eigen OAuth-client van de gebruiker (stappen in DOCS.md en in de app); het toestemmingsscherm moet op "In productie", anders verloopt de koppeling na 7 dagen.
- Agenda: geen herhalende planning, geen meerdaagse planning, slepen niet mogelijk; verschuiven van een "Onderhoud: …"-afspraak op de telefoon wordt door de app teruggezet (vaste datum = inplannen).
- 1.1.0–1.3.0 niet getest op Android (camera in de pagina bij uitvoeren, balk in de HA-app).
- Twee apparaten tegelijk in dezelfde uitvoering: laatste schrijfactie wint. Duur = wandkloktijd van start tot afronden.
- Het stappenplan staat niet in de taak-PDF; geüploade maar nooit opgeslagen uitlegafbeeldingen blijven als wees staan.
- Module Reizen is nog een lege placeholder. `voorbeeld/` alleen in de werkmap; niet publiceren.

## Volgende stappen
1. Gebruiker: beslissen over publiceren (PR #1 bijwerken met `261106` en samenvoegen) en daarna in HA bijwerken naar 1.4.0.
2. In HA: iCloud (Apple ID + app-specifiek wachtwoord) of Google (eigen OAuth-client) instellen, kalender kiezen en controleren: punten verschijnen, verschuiven op de telefoon komt terug, "Onderhoud: …" voor open taken.
3. Branch `agenda-google-icloud` in `Shipborn/ha-logboek` verwijderen (na akkoord).
4. Open vragen: stappenplan in de taak-PDF? Bestede tijd alleen tellen als de uitvoering open is? Inhoud van Reizen? Git i.p.v. datummappen (1.3.0/1.4.0 zijn al in git gemaakt)?
