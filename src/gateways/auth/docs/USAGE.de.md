# Anwendung

Praktische Abläufe für Anmelden.

## Voraussetzungen

Nutze einen aktiven Anbieter; Registrierung kann eine Einladung verlangen.

## Beispiele

Melde dich an, bestätige nötige Prüfungen, öffne Kontosicherheit in Einstellungen und melde dich anschließend ab.

Lösen Sie `auth:authorizeAccountTarget` in Version 1 über `system:contracts` auf. Übergeben Sie `{ actor: { sub, role }, accountId, allowSelf }` mit den Ansprüchen der injizierten Auth-Prüfung. Die Benutzerverwaltung setzt `allowSelf: false`, die Selbstverwaltung `true`.

Eine erlaubte Entscheidung lautet `{ allowed: true, accountId, isCurrent }`. Prüfen Sie das genaue Ziel und rufen Sie unmittelbar vor dessen Verwendung `isCurrent()` auf. Eine Ablehnung lautet `{ allowed: false, status, code }`. Fehlende oder inkompatible Verträge bedeuten Nichtverfügbarkeit und erlauben keine schwächere Prüfung.

Die optionale Einschränkung `allowFounder` entspricht bei Auslassung `true`. Der Wert `false` lehnt Gründerkonten unabhängig von Akteur- oder Zielrolle mit `403 protected_founder_account` ab. Ein übergebener nichtboolescher Wert ergibt `400 bad_request`. Gewöhnliche Users-Aktionen und TFA behalten ihr bisheriges Gründerverhalten; nur geschützte Deprovisionierung fordert diese zusätzliche Einschränkung an. Alternative Anbieter müssen sie als Teil dieses Vertrags in Version 1 implementieren und dürfen sie nicht stillschweigend ignorieren.

Bei `allowSelf: true` und `allowFounder: false` liest auch die Selbstverwaltung maßgebliche Metadaten und kann bei einem Gründer, fehlenden Konto oder nicht verfügbaren Metadaten scheitern. Ohne Gründerbeschränkung bleibt Selbstverwaltung ohne Metadatenabfrage erhalten.

## Erwartete Ergebnisse

Cognis erstellt eine kontogebundene Sitzung; Anbieter- und Kontoregeln bleiben wirksam.

## Fehlerbehebung

Prüfe Anbieter, Bestätigung und Kontostatus. Ein abgebrochener Schlüsselbundzugriff ist kein fehlgeschlagener Login.
