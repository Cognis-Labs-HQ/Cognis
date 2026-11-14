# TFA-Wartezeit beim Neuversand

**Feature-Zweig:** feature-tfa-resend-timing

## Ohne erneutes Warten fortsetzen

Beim Fortsetzen einer bestehenden Login-Challenge oder erneuter Auswahl ihrer Methode bleibt der vom Server ausgegebene absolute Zeitpunkt für den Neuversand erhalten. Ein bereits verstrichener Zeitpunkt startet die ursprüngliche Wartezeit nicht erneut. Fehlt ein gültiger absoluter Zeitpunkt, gilt weiterhin die relative Wartezeit des Anbieters.

## Schutz beim Neuversand erhalten

Der Neuversand bleibt bis zur Freigabe deaktiviert. Auch danach gelten die serverseitigen Versandlimits. Anzeigen oder Fortsetzen sendet eine bestehende Challenge niemals automatisch erneut. Ausgegebene Codelänge, Verifikation, Methodenwahl und die Zuständigkeit neuerer Anmeldeversuche bleiben unverändert.

## Commits

- [b934e3675cef0d19580bcbe422264a3d920e38b8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b934e3675cef0d19580bcbe422264a3d920e38b8)
