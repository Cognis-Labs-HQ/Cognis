# Reaktionen & Emoji-Erweiterung

## Zusammenfassung

Bestehende Nachrichtenreaktionen bleiben nun dauerhaft sichtbar, auch wenn die Maus nicht über der Nachricht schwebt. Die Schnellreaktion-Leiste zeigt jetzt fünf anpassbare Emojis, die sich an die am häufigsten genutzten Reaktionen des Benutzers anpassen. Eine neue Schaltfläche „···" öffnet eine durchsuchbare Emoji-Auswahl mit über 300 Emojis aus einer neuen Datendatei im Social-Gateway. Die Versionsnummer des social-messages-Adapters wurde ebenfalls aktualisiert.

## Geänderte Dateien und Komponenten

- `src/gateways/social/ui/emojis.json` — neue umfassende Emoji-Datendatei (300+ Emojis)
- `src/adapters/social/messages/ui/app.js` — adaptives Schnell-Emoji-System, Nutzungsverfolgung, vollständiges Emoji-Auswahlfenster, Reaktionszeilen-Persistenz
- `src/adapters/social/messages/ui/messages.css` — CSS aufgeteilt: Reaktions-Chips immer sichtbar, Hinzufügen-Schaltflächen nur beim Hover
- `src/adapters/social/messages/ui/languages/en/strings.xml` — neue i18n-Schlüssel
- `src/adapters/social/messages/ui/languages/de/strings.xml` — deutsche Übersetzungen
- `src/adapters/social/messages/ui/languages/id/strings.xml` — indonesische Übersetzungen
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — japanische Übersetzungen
- `src/adapters/social/messages/manifest.json` — Versionserhöhung 1.4.0 → 1.4.1

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/2a9c702
