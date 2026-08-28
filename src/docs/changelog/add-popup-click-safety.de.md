# Schließschutz für Formulare

**Feature Branch:** copilot/add-popup-click-safety

## Bestätigungsdialog vor dem Verwerfen ungespeicherter Formularänderungen

Popups mit Formulareingaben fragen jetzt nach einer Bestätigung, bevor sie durch Klick auf den Hintergrund, die ×-Schaltfläche oder die Escape-Taste geschlossen werden — sofern ein Feld geändert wurde. „Verwerfen" schließt das Formular; „Abbrechen" bringt den Nutzer zu seinen laufenden Eingaben zurück.

## Betroffene Popups

Profil bearbeiten, Passwort ändern, Adapter-Konfiguration, E-Mail-Einladung, Nutzereingaben, Lehrerantrag und Schülereinladung erhalten diesen Schutz. Die `openPopup`-API unterstützt die neue Option `closeProtection` für beliebige Formular-Popups mit i18n-aufgelösten Zeichenketten.

## Commits

- [b943b35](https://github.com/Cognis-Labs-HQ/Cognis/commit/b943b359f0aff9872e9c4817e28c4b2381a16253)
