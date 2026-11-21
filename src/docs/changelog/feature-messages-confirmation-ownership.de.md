# Gebundene Bestätigungen

**Feature-Zweig:** feature-messages-confirmation-ownership

## Auswahl beim Ursprung halten

Nachrichten 2.8.2 bindet Austritt und Vorlagenbestätigungen an ihren ursprünglichen Kontext. Sicheres Schließen ändert nichts; doppelte oder veraltete Steuerelemente wiederholen keine Schreibvorgänge. Neuere Räume, Konten, Sitzungen und Vorlageneinstellungen bleiben erhalten.

## Bestätigte Ergebnisse melden

Austritt unterscheidet Ablehnung, ungewisse Zustellung und Aktualisierungsfehler nach Bestätigung, ohne automatische Wiederholung. Die Folgeabfrage benötigt eine frische erfolgreiche Liste. Vorlagen speichern einmal und bewahren neuere Änderungen. Vier übersetzte Anleitungen und Ergebnismeldungen begleiten die Änderung. Serverregeln und Darstellungsversion 2 bleiben unverändert; Profil 4.0.0 und Interne Benachrichtigungen 0.5.36 bleiben erhalten.

Dies setzt #542 und #330 begrenzt für Nachrichten fort; beide umfassenderen Prüfungen bleiben teilweise offen.

## Änderungen

- [d42f534be9ab33a9041d203572f0f0731206d5ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/d42f534be9ab33a9041d203572f0f0731206d5ad)
