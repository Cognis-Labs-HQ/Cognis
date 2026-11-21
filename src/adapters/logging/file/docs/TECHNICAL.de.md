# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Dateiprotokolle.

## Schnittstellen

Die Konfiguration erfolgt über den zuständigen Funktionsdienst, nicht über einen eigenen Verwaltungsdienst.

## Konfiguration

`level` verwendet die unterstützten Protokollstufen. `rotateMaxBytes` ist eine endliche positive Zahl, `rotateMaxFiles` eine nichtnegative Ganzzahl und `rotateCompress` ein Wahrheitswert.

## Verhalten

Der Adapter liefert `fileLevel` und die Rotationseinstellungen `maxBytes`, `maxFiles` und `compressRotated`. Speicherung und Rotation gehören dem Protokolldienst.

## Sicherheit

Nur Administratoren ändern Zustell- oder Speichereinstellungen. Anfragen behalten die vom zuständigen Funktionsdienst geprüften Anmelde- und Ressourcenrechte.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/logging/file/`.
