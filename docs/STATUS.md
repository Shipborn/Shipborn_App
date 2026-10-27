# Status

**Versie 1.2.0**, werkmap `261027_2`. Op GitHub (`Shipborn/Shipborn_App`, main). De oude repository `Shipborn/ha-logboek` staat op 0.16.0 en blijft zo, zonder verwijzing naar de nieuwe (besluit gebruiker).

## Gedaan
- 0.14.0–0.16.0 (in `Shipborn/ha-logboek`): modules, frontend per tabblad, Onderhoud-module met urentellers en stappenplannen.
- 1.0.0: nieuwe app `shipborn_app` in `Shipborn/Shipborn_App`, opslag per soort en per maand in `/share/shipborn`, overzetten uit de oude app. De gebruiker heeft de overstap in HA gedaan en meldt dat het goed werkt.
- 1.1.0:
  - **Parallelle uitvoeringen**: een stappenplan minimaliseren (– of Esc) naar een balk onderin, meerdere tegelijk, wisselen in het venster of via de balk; Taken toont "Verder ›" en de stap. Alles wordt direct op de server bewaard (stap, opmerkingen, foto's), dus herladen en een ander apparaat werken.
  - Overzet-functie (knop + API) verwijderd.
- 1.2.0: **Taak kopiëren** in de geschiedenisdialoog (kopie met naam "Nieuwe taak", inclusief stappenplan). Uitlegafbeeldingen worden gedeeld en pas opgeruimd als geen taak of uitvoering ze meer gebruikt. Lokaal getest: kopie maken en opslaan, origineel verwijderen (afbeelding van de kopie blijft), kopie verwijderen (afbeelding opgeruimd).
- Lokaal getest met nep-HA: twee uitvoeringen parallel, minimaliseren, wisselen, opmerking bewaard bij wisselen, herladen (beide terug in de balk), balk zichtbaar in andere modules, verplichte foto (knop én server weigeren), afronden (logregel met foto's per stap, opmerking, urenstanden), afbreken.

## Niet gedaan / niet getest
- 1.1.0 niet getest in Home Assistant en niet op Android (camera in de pagina bij uitvoeren, gedrag van de balk in de HA-app).
- Twee apparaten tegelijk in dezelfde uitvoering: laatste schrijfactie wint; een opmerking die op het ene apparaat getypt wordt kan die van het andere overschrijven.
- De duur is de wandkloktijd van start tot afronden (ook geminimaliseerde tijd).
- Het stappenplan staat niet in de taak-PDF; ongebruikte geüploade uitlegafbeeldingen blijven staan.
- `voorbeeld/` (voorbeeld-YAML van de gebruiker) staat alleen in de werkmap; niet publiceren.

## Volgende stappen
1. In HA bijwerken naar 1.2.0; parallelle uitvoeringen en taak kopiëren op de telefoon testen.
2. Open vragen: stappenplan in de taak-PDF? Bestede tijd alleen tellen als de uitvoering open is? Inhoud van Reizen? Git i.p.v. datummappen?
