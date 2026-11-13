# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Authentifikator-Bestätigung.

## Schnittstellen

Die Methode implementiert TFA: Einrichtung liefert manualSecret und qrSvg, Bestätigung prüft einen Code und Verifikation nutzt secret, algorithm, digits und period.

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

### Typverträge

Der Adapter besitzt eine eng gefasste Deklaration für die Promise-basierte SVG-Operation des QR-Renderers einschließlich Fehlerkorrekturstufe, Rand und Breite. Einrichtungstests prüfen den tatsächlichen Renderer. Codelänge, Algorithmusauswahl und Prüfzeitfenster bleiben unverändert.

## Sicherheit

Aktivierung erfolgt erst nach gültiger sechsstelliger Bestätigung. Schütze das Geheimnis; Prüfung akzeptiert die aktuelle Dreißigsekundenperiode und je eine benachbarte Periode.

## Referenz

- [src/adapters/tfa/totp/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/manifest.json)
- [src/adapters/tfa/totp/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/package.json)
- [src/adapters/tfa/totp/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/totp/index.ts)
