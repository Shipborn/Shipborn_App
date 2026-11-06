# Status

**Versie 1.3.0**, werkmap `261027_2`. Op GitHub (`Shipborn/Shipborn_App`, main). De oude repository `Shipborn/ha-logboek` blijft zonder verwijzing naar de nieuwe (besluit gebruiker) en staat op 0.16.0 (de per ongeluk gepushte agenda 0.17.0 is op 2026-11-05 teruggedraaid).

## Gedaan
- 0.14.0–0.16.0 (in `Shipborn/ha-logboek`): modules, frontend per tabblad, Onderhoud-module met urentellers en stappenplannen.
- 1.0.0: nieuwe app `shipborn_app` in `Shipborn/Shipborn_App`, opslag per soort en per maand in `/share/shipborn`, overzetten uit de oude app. De gebruiker heeft de overstap in HA gedaan en meldt dat het goed werkt.
- 1.1.0:
  - **Parallelle uitvoeringen**: een stappenplan minimaliseren (– of Esc) naar een balk onderin, meerdere tegelijk, wisselen in het venster of via de balk; Taken toont "Verder ›" en de stap. Alles wordt direct op de server bewaard (stap, opmerkingen, foto's), dus herladen en een ander apparaat werken.
  - Overzet-functie (knop + API) verwijderd.
- 1.2.0: **Taak kopiëren** in de geschiedenisdialoog (kopie met naam "Nieuwe taak", inclusief stappenplan). Uitlegafbeeldingen worden gedeeld en pas opgeruimd als geen taak of uitvoering ze meer gebruikt. Lokaal getest: kopie maken en opslaan, origineel verwijderen (afbeelding van de kopie blijft), kopie verwijderen (afbeelding opgeruimd).
- Lokaal getest met nep-HA: twee uitvoeringen parallel, minimaliseren, wisselen, opmerking bewaard bij wisselen, herladen (beide terug in de balk), balk zichtbaar in andere modules, verplichte foto (knop én server weigeren), afronden (logregel met foto's per stap, opmerking, urenstanden), afbreken.
- 1.3.0: module **Agenda**: maandkalender met logregels, geplande taken/losse punten en verwachte datums volgens interval; inplannen, afvinken, uitvoeren vanuit de agenda (logregel of afgeronde uitvoering rondt het punt af). Taken tonen "Ingepland op", Inplannen in de taakgeschiedenis. Lokaal getest met nep-HA: inplannen, koppeling via `planning_id` en automatisch (ook bij afronden van een uitvoering), "Verder ›" bij een lopende uitvoering, afvinken, teller, telefoonbreedte.

## Niet gedaan / niet getest
- 1.1.0 niet getest in Home Assistant en niet op Android (camera in de pagina bij uitvoeren, gedrag van de balk in de HA-app).
- Twee apparaten tegelijk in dezelfde uitvoering: laatste schrijfactie wint; een opmerking die op het ene apparaat getypt wordt kan die van het andere overschrijven.
- De duur is de wandkloktijd van start tot afronden (ook geminimaliseerde tijd).
- Agenda: niet in HA/Android getest; geen MQTT-sensor of HA-kalender voor geplande punten; geen herhalende planning; intervallen op uren staan niet in de agenda.
- Het stappenplan staat niet in de taak-PDF; ongebruikte geüploade uitlegafbeeldingen blijven staan.
- `voorbeeld/` (voorbeeld-YAML van de gebruiker) staat alleen in de werkmap; niet publiceren.

## Volgende stappen
1. In HA bijwerken naar 1.3.0 en de agenda proberen; ook parallelle uitvoeringen en taak kopiëren op de telefoon testen.
2. Open vragen: stappenplan in de taak-PDF? Bestede tijd alleen tellen als de uitvoering open is? Inhoud van Reizen? Git i.p.v. datummappen?

## 1.4.0 (2026-11-06, niet gecommit)
- Agenda gekoppeld aan iCloud/CalDAV of Google Agenda (Instellingen › Agenda); planning met tijd en duur.
- Getest met Radicale en nep-Google via de API: omzetting van 1.3.0, versturen, afvinken, wijzigen/verwijderen op de telefoon, uitvoeren, Google koppelen.
- In de browser gecontroleerd: agenda met tijd, afspraken uit de agenda, planningsdialoog, Instellingen › Agenda.
- **Nog niet getest:** met echte iCloud/Google, in Home Assistant en de Docker-build (nieuwe pakketten `icalendar`, `recurring-ical-events`). Bij Google aangenomen: `events/import` zet een eerder verwijderde afspraak terug, PATCH met `null` voor date/dateTime wisselt tussen hele dag en tijd.

