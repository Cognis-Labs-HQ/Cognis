# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Authentifikator-Bestätigung.

## Schnittstellen

Authentifikator-Bestätigung wird über den zuständigen Funktionsdienst eingebunden; das Manifest nennt die Komponente und ihre Abhängigkeiten.

## Konfiguration

### Konfiguration

Der Adapter bietet eine Admin-Einstellung:

- `algorithm` — HMAC-Algorithmus für Setup- und Login-Prüfung.

Die Methode deklariert Platzhalter, Sprachbasis und Konfigurationsbeschriftungen; das Gateway stellt diese ohne Verzweigung nach Anbieterkennung dar.

## Verhalten

### TOTP-Adapter

Dieser Adapter verwaltet die Überschreibung `COGNIS_TOTP_ISSUER`. Ungültige Codes verwenden den gemeinsamen Fehler `invalid_verification_code`, damit das Gateway keine anbieterspezifische Fehlerbehandlung benötigt.

### Zweck

Stellt zeitbasierte Einmalpasswort-Prüfung für das TFA-Gateway bereit.

### Einrichtungsablauf

1. Der Adapter erzeugt ein Base32-Secret.
2. Er liefert `manualSecret` und `qrSvg` für die Setup-Oberfläche.
3. Der Benutzer bestätigt die Einrichtung mit einem 6-stelligen Code.
4. Bei Erfolg werden `secret`, `algorithm`, `digits` und `period` gespeichert.

### Prüfregeln

- Token-Länge: `6` Stellen.
- Zeitfenster: `30` Sekunden.
- Erlaubte Abweichung: vorheriges, aktuelles und nächstes Fenster.
- Standard-Algorithmus: `SHA256`.
- Unterstützte Algorithmen: `SHA1`, `SHA256`, `SHA512`.

## Sicherheit

Der Zugriff auf Authentifikator-Bestätigung unterliegt dem Aufrufer und dem zuständigen Funktionsdienst. Die Aktivierung erweitert keine Kontorechte.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/tfa/totp/`.
