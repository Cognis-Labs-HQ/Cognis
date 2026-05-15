# PR-Changelog — Mechanismus für Nachrichtenanfragen Hinzugefügt

## Zusammenfassung

Der Nachrichten-Button im Profil wurde korrigiert, sodass ein Klick jetzt
immer eine Aktion ausführt: bestehenden Direkt-Chat öffnen, neuen Direkt-Chat
erstellen oder eine Nachrichtenanfrage senden, wenn Direktnachrichten noch
nicht erlaubt sind.

Nachrichtenanfragen wurden als offizieller Startweg für Unterhaltungen
hinzugefügt, wenn sich zwei Nutzer nicht gegenseitig folgen. Bei gegenseitigem
Folgen wird weiterhin direkt ein Chat gestartet.

Zusätzlich wurden Lesebestätigungen, Tippindikatoren und Emoji-Reaktionen für
die Nachrichten-API und die UI ergänzt.

Das Häkchen-System für Lesebestätigungen wurde durch ein Avatar-basiertes
Design ersetzt. Gesendete Nachrichten zeigen zunächst einen kleinen
Auskreisring, einen ausgefüllten Kreis nach Serverbestätigung und danach
den Avatar des Lesers. Gruppenunterhaltungen zeigen mehrere Avatare
nebeneinander. Tooltips bei Emoji-Reaktionen zeigen jetzt ein einzelnes
beschreibendes Wort („Like", „Heart", „Haha", „Celebrate").

## Geänderte Komponenten und Dateien

- Social-Messages-Adapter:
    - `src/adapters/social/messages/store.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/messages.css`
    - `src/adapters/social/messages/tests/routes.test.ts`
    - `src/adapters/social/messages/tests/store.test.ts`
    - `src/adapters/social/messages/docs/standard.en.md`
    - `src/adapters/social/messages/package.json`
- Social-Profile-Adapter:
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/package.json`
- Lokalisierung:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Versionsindex:
    - `src/docs/versions.en.md`

## Commits

- [d4f7f6d](https://github.com/le-firehawk/Cognis/commit/d4f7f6d)
- [fc3febe](https://github.com/le-firehawk/Cognis/commit/fc3febe)
- [11eebfa](https://github.com/le-firehawk/Cognis/commit/11eebfa)
- [2db27c2](https://github.com/le-firehawk/Cognis/commit/2db27c2)
- [f08f248](https://github.com/le-firehawk/Cognis/commit/f08f248ea1b20fef4b7e5452e19a2857ed4b785e)
