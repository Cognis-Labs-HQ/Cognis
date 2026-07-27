# Kalender-Authentifizierung

## Erkennung geschützter Kalender

Kalender-Clients erhalten nun beim Prüfen einer gültigen passwortgeschützten Kalenderfreigabe eine Authentifizierungsaufforderung statt einer nicht unterscheidbaren Nicht-gefunden-Antwort.

## Sichere Token-Prüfung

Share kann die Existenz und Gültigkeit eines Tokens prüfen, ohne dessen Passwort zu umgehen. Dadurch kann Calendar Anmeldedaten anfordern, bevor freigegebene Inhalte zurückgegeben werden.
