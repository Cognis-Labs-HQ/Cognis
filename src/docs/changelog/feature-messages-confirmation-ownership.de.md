# Gebundene Bestätigungen

**Feature-Zweig:** feature-messages-confirmation-ownership

## Auswahl beim Ursprung halten

Nachrichten 2.8.2 bindet Austritt und Vorlagenbestätigungen an ihren ursprünglichen Kontext. Sicheres Schließen ändert nichts; doppelte oder veraltete Steuerelemente wiederholen keine Schreibvorgänge. Neuere Räume, Konten, Sitzungen und Vorlageneinstellungen bleiben erhalten.

## Bestätigte Ergebnisse melden

Austritt unterscheidet Ablehnung, ungewisse Zustellung und Aktualisierungsfehler nach Bestätigung, ohne automatische Wiederholung. Die Folgeabfrage benötigt eine frische erfolgreiche Liste. Vorlagen speichern einmal und bewahren neuere Änderungen. Vier übersetzte Anleitungen und Ergebnismeldungen begleiten die Änderung. Serverregeln und Darstellungsversion 2 bleiben unverändert; Profil 4.0.0 und Interne Benachrichtigungen 0.5.36 bleiben erhalten.

Dies setzt #542 und #330 begrenzt für Nachrichten fort; beide umfassenderen Prüfungen bleiben teilweise offen.

## Änderungen

- [44a383823bb5df1be0a03267d066af1de856f6ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/44a383823bb5df1be0a03267d066af1de856f6ac)
- [acd169da920a98241254fddfa1a6b69580a0ed3a](https://github.com/Cognis-Labs-HQ/Cognis/commit/acd169da920a98241254fddfa1a6b69580a0ed3a)
- [6aeeab93379e5850f88aa9d49ac16f6144d8c0c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/6aeeab93379e5850f88aa9d49ac16f6144d8c0c6)
- [7d135897d848c17f844d74f7ededacd4c574126c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d135897d848c17f844d74f7ededacd4c574126c)
