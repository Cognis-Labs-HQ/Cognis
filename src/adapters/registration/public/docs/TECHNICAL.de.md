# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Öffentliche Registrierung.

## Schnittstellen

Trägt einen `register`-Anbieter zum Registrierungsdienst bei. Eingaben sind `username`, `password` sowie optional `email` und `displayName`; eine unabhängige HTTP-Route gibt es nicht.

## Konfiguration

Aktivieren Sie öffentliche Registrierung nur dann in der Registrierungsverwaltung, wenn Konten ohne Einladungstoken erstellt werden dürfen.

## Verhalten

Der Anbieter bereinigt Benutzernamen und Anzeigenamen, verlangt Benutzername und Passwort, erstellt ein lokales Konto mit der Rolle `user` und ruft gegebenenfalls die eingespeiste Profilerstellung auf.

## Sicherheit

Aufrufer können über diesen Anbieter keine Verwaltungsrolle anfordern. Registrierungspolitik und fortgesetzte externe Identitäten prüft der zuständige Funktionsdienst.

## Referenz

Quellcode und Paketmetadaten: `src/adapters/registration/public/`.
