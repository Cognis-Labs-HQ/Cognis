# Reaktionen & Emoji-Erweiterung

**Feature Branch:** copilot/tweak-message-reactions-and-fix-manifests

## Zusammenfassung

Bestehende Nachrichtenreaktionen bleiben nun dauerhaft sichtbar, auch wenn die Maus nicht über der Nachricht schwebt. Die Schnellreaktion-Leiste zeigt jetzt fünf anpassbare Emojis, die sich an die am häufigsten genutzten Reaktionen des Benutzers anpassen. Eine neue Schaltfläche „···" öffnet eine durchsuchbare Emoji-Auswahl mit über 300 Emojis.

Die Emoji-Nutzung wird jetzt benutzerbezogen in der Datenbank gespeichert, nicht mehr im localStorage. Eine neue Tabelle `chat_emoji_usage` speichert die Auswahl jedes Benutzers und wird beim Laden der Seite abgerufen. Die fünf Schnellreaktion-Slots haben keine fest codierten Standardwerte mehr — wenn keine gespeicherte Nutzungshistorie vorhanden ist, werden die ersten Einträge aus dem Emoji-Katalog als Standardwerte verwendet.

Alle Emoji-Namen im Katalog sind jetzt Lokalisierungsschlüssel, die über die Sprachdateien des Social-Gateways aufgelöst werden. Suche und Schaltflächentitel im Picker zeigen übersetzte Namen.

## Geänderte Dateien und Komponenten

- `src/gateways/social/ui/emojis.json` — Emoji-Namen als i18n-Schlüssel
- `src/gateways/social/ui/languages/*/strings.xml` — neue Social-Gateway-Sprachdateien mit 366 übersetzten Emoji-Namen
- `src/adapters/social/messages/store.ts` — neue Tabelle `chat_emoji_usage`; Methoden `incrementEmojiUsage` und `getTopEmojiUsage`
- `src/adapters/social/messages/routes.ts` — neue Routen `GET/POST /api/v1/social/messages/emoji-usage`
- `src/adapters/social/messages/ui/app.js` — serverbasierte Emoji-Nutzung, i18n-Namensauflösung, keine fest codierten Standardwerte
- `src/adapters/social/messages/ui/messages.css` — CSS aufgeteilt: Reaktions-Chips immer sichtbar, Hinzufügen-Schaltflächen nur beim Hover
- `src/adapters/social/messages/ui/languages/en/strings.xml` — neue i18n-Schlüssel
- `src/adapters/social/messages/ui/languages/de/strings.xml` — deutsche Übersetzungen
- `src/adapters/social/messages/ui/languages/id/strings.xml` — indonesische Übersetzungen
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — japanische Übersetzungen
- `src/adapters/social/messages/tests/store.test.ts` — Tests für Emoji-Nutzungsschema und -methoden
- `src/adapters/social/messages/manifest.json` — Versionserhöhung 1.4.0 → 1.4.1

## Commit-Links

- [2a9c702](https://github.com/Cognis-Labs-HQ/Cognis/commit/2a9c702)
- [295496e](https://github.com/Cognis-Labs-HQ/Cognis/commit/295496e)
- [1e40511](https://github.com/Cognis-Labs-HQ/Cognis/commit/1e40511)
- [e19669d](https://github.com/Cognis-Labs-HQ/Cognis/commit/e19669d)
