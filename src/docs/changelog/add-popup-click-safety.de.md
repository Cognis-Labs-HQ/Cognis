# Schließschutz für Formular-Popups

## Bestätigungsdialog vor dem Verwerfen ungespeicherter Formularänderungen

Popups mit Formulareingaben fragen jetzt nach einer Bestätigung, bevor sie durch Klick auf den Hintergrund, die ×-Schaltfläche oder die Escape-Taste geschlossen werden — sofern ein Feld geändert wurde. „Verwerfen" schließt das Formular; „Abbrechen" bringt den Nutzer zu seinen laufenden Eingaben zurück.

## Betroffene Popups

Profil bearbeiten, Passwort ändern, Adapter-Konfiguration, E-Mail-Einladung, Nutzereingaben, Lehrerantrag und Schülereinladung erhalten diesen Schutz. Die `openPopup`-API unterstützt die neue Option `closeConfirm` für beliebige Formular-Popups mit i18n-aufgelösten Zeichenketten.
