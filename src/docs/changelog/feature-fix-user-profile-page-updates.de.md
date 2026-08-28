# Direkte Profilupdates

**Feature Branch:** feature-fix-user-profile-page-updates

## Sofortige Profildaten

Gespeicherte Anzeigenamen und andere Profildaten erscheinen jetzt ohne Neuladen der Seite.

## Zuverlässige soziale Updates

Follower- und Gefolgt-Zahlen werden jetzt zusammen mit den zugehörigen Benutzerkarten direkt aktualisiert.

## Einzelne Bildauswahl

Interaktionen mit Avatar und Banner verhindern jetzt doppelte Auswahldialoge und gleichzeitige Uploads.

## Sofortige soziale Zähler

Folgen und Entfolgen aktualisiert nun die sichtbaren Profilzähler und zugehörigen Kontaktkarten, sobald die Anfrage erfolgreich ist, ohne auf nachfolgende Listenanfragen zu warten.

## Sofortiges Bannerlayout

Eine Änderung der Profilbannerhöhe zeichnet das Banner nun neu, bevor das Speichern der Einstellung abgeschlossen ist.

## Composer-weite Live-Aktualisierung

Page-Composer-Aktualisierungen rendern vorhandene Karten nun standardmäßig neu und beseitigen veraltete Inhalte auf normalen Seiten. Zustandsbehaftete Meeting-Einbettungen verwenden weiterhin gezielt DOM-Parking.

## Zuverlässige Komponentenressourcen

Die Profilseite besitzt nun die Texte ihrer Nachrichtenaktionen selbst, statt Ressourcen von einem unabhängig deaktivierbaren Adapter anzufordern. Prüfungen für Browserpfade validieren jetzt statische und dynamische Importe, bereitgestellte Sprachpfade, Grenzen deaktivierbarer Adapter und relative Pfade innerhalb der UI-Pakete von Adaptern.

## Profilkarten bleiben bedienbar

Gezielte Profilaktualisierungen laufen nun über den Seiten-Composer. Nicht betroffene eingebettete Medien bleiben erhalten und Formulare sowie Karten funktionieren nach dem Neuzeichnen weiterhin.

## Follower-Zahlen sofort aktuell

Beim Folgen eines angezeigten Profils wird das aktuelle Konto nun vor dem Serverabgleich zur vorläufigen Follower-Liste hinzugefügt.

## Commits

- [597aa63](https://github.com/Cognis-Labs-HQ/Cognis/commit/597aa63d6ef878eb2e40d6d8050a9956387fc0e8)
