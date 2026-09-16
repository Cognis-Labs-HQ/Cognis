# TOTP-Adapter

## Zweck

Stellt zeitbasierte Einmalpasswort-Prüfung für das TFA-Gateway bereit.

## Einrichtungsablauf

1. Der Adapter erzeugt ein Base32-Secret.
2. Er liefert `manualSecret` und `qrSvg` für die Setup-Oberfläche.
3. Der Benutzer bestätigt die Einrichtung mit einem 6-stelligen Code.
4. Bei Erfolg werden `secret`, `algorithm`, `digits` und `period` gespeichert.

## Prüfregeln

- Token-Länge: `6` Stellen.
- Zeitfenster: `30` Sekunden.
- Erlaubte Abweichung: vorheriges, aktuelles und nächstes Fenster.
- Standard-Algorithmus: `SHA256`.
- Unterstützte Algorithmen: `SHA1`, `SHA256`, `SHA512`.

## Konfiguration

Der Adapter bietet eine Admin-Einstellung:

- `algorithm` — HMAC-Algorithmus für Setup- und Login-Prüfung.
