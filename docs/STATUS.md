# Status

**Versie 1.0.0** (nieuwe app `shipborn_app`), werkmap `261027`. Op GitHub in de nieuwe repository `Shipborn/Shipborn_App` (main, 2026-10-27). De oude repository `Shipborn/ha-logboek` staat op 0.16.0 (commit `1f6d228`) en blijft zo.

## Gedaan
- 0.14.0–0.16.0 (in `Shipborn/ha-logboek`): modules, frontend per tabblad, Onderhoud-module met urentellers en stappenplannen.
- 1.0.0:
  - Nieuwe slug `shipborn_app`, repository-URL `Shipborn/Shipborn_App`, MQTT-namen `shipborn_…`.
  - Nieuwe opslag: `/data/shipborn.db` en `/share/shipborn/{fotos/<jjjj>/<mm>, stappenplannen, backup, logo.png}`; paden relatief in de database; de foto-route geeft alleen foto's vrij.
  - **Instellingen › Overzetten uit de oude Logboek-app**: kopieert database, foto's (naar de nieuwe mapstructuur), uitlegafbeeldingen en logo uit `/share/logboek`; de oude map blijft ongewijzigd.
- Lokaal getest met de testdata van 0.16 als "oude app": overzetten (9 bestanden, niets ontbrekend), foto's en miniaturen bereikbaar, back-up niet via de foto-URL op te vragen, nieuwe uploads in `fotos/2026/10`, foto bewerken/herstellen, uitlegafbeelding, weigering zonder "vervangen", opnieuw overzetten met "vervangen" (eigen bestanden opgeruimd, overgezette blijven), PDF en CSV, oude map onaangeroerd.

## Niet gedaan / niet getest
- Niet getest in Home Assistant (installatie uit de nieuwe repository, overzetten met de echte `/share/logboek`, MQTT-sensoren). De echte oude app draait 0.13.1 of 0.16.0; overzetten uit 0.13.1 is alleen indirect getest (schema-migratie via `init_db`).
- Niet getest op Android.
- Een lopende uitvoering van een stappenplan wordt niet bewaard; het stappenplan staat niet in de taak-PDF; ongebruikte geüploade uitlegafbeeldingen blijven staan.
- `voorbeeld/` (voorbeeld-YAML van de gebruiker) staat alleen in de werkmap; niet publiceren.

## Volgende stappen
1. Controleren of `Shipborn/Shipborn_App` openbaar is; een privé-repository kan HA niet zonder meer installeren.
2. In HA: repository toevoegen, Shipborn App installeren, opties overnemen, oude app stoppen, **Overzetten**, urentellers en sensoren controleren, automatiseringen aanpassen, oude app verwijderen.
3. Eventueel in `Shipborn/ha-logboek` een verwijzing naar de nieuwe repository zetten.
4. Open vragen: lopende uitvoering bewaren? Stappenplan in de taak-PDF? Inhoud van Reizen? Git i.p.v. datummappen?
