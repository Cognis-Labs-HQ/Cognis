# Freigabeempfänger bleiben angemeldet

## Geschützte Freigaben fragen nach dem Passwort statt als fehlend zu erscheinen

Das Freigabe-Gateway unterscheidet nun ein gültiges passwortgeschütztes Token von einem ungültigen Token. Die Freigabeseite erhält eine Authentifizierungsanforderung, prüft den verschlüsselten Schlüsselbund, fragt bei Bedarf nach, speichert das bestätigte Passwort und lädt anschließend das freigegebene Objekt.

## Der Zugriff über Benachrichtigungen ersetzt den Anmeldestatus nicht mehr

Angemeldete Empfänger behalten beim Öffnen einer Freigabebenachrichtigung ihr Konto-Token. Ein getrenntes, eingeschränktes Freigabe-Token wird für gemeinsame API-Aktionen direkt an Komponenten übergeben, sodass Kalenderänderungen berechtigungsgesteuert bleiben, ohne den Benutzer abzumelden.
