# Korrektur für statisches Modulladen

## Statische Assets umgehen Catch-all-Routen

Statische UI-Assets werden jetzt vor registrierten Catch-all-Routen ausgeliefert, damit wiederverwendbare dynamische Importe nicht mehr von auth-geschützten Handlern abgefangen und als 401-Antworten zurückgegeben werden können.
