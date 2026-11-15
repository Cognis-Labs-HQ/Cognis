# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich     | Anleitung            | Zugriff             |
| ------------------- | -------------------- | ------------------- |
| `^/profile(?:/\|$)` | Profile und Beiträge | Angemeldeter Nutzer |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Identität, Beiträge und Kontoaktionen verwenden die gerenderten Profilbereiche, auch bei leerer Beitragsliste. Das Seitensignal besitzt die Lebensdauer der Anleitung.

Beiträge haben ein eigenes Listenziel, auch bei sichtbarem Editor. Sozialaktionen umfassen nur ihre Schaltflächen; die Vorschau entfällt bei fremden Profilen.

Identität und Sozialaktionen stehen vor den aufeinanderfolgenden Beitrags- und Vorschauschritten.

Im eigenen Profil öffnet Profil bearbeiten Ihre Angaben. Bei einem Speicherfehler bleiben Ihre Änderungen zum Korrigieren und erneuten Versuchen erhalten.

Profilfotos bleiben sichtbar, während Zahlen und Details aktualisiert werden. Öffnen Sie das Profil nach einem fehlgeschlagenen Bildabruf erneut; eine bestätigte Entfernung löscht nur das ausgewählte Bild. Der Identitätsschritt behält sein Ziel, seinen Ablauf und seine Abschlusskennung.

Initialen in Navigation, Vorschau und Profil folgen denselben Namens- und Farbregeln. Der Vorschauavatar öffnet dieses Profil. Nach einer Namensänderung zeigen auch Ersatzinitialen bei Bildfehlern den aktuellen Namen. Bestehende Identitäts- und Avataraktionen behalten ihre Tutorialziele, Schrittfolge und Abschlusskennungen.

Die interaktive Vorschau ist ein benannter nichtmodaler Dialog. Beim Darüberfahren wird der Tastaturfokus nicht verschoben; ein fokussiertes Fenster bleibt beim Wegbewegen des Zeigers offen. Escape schließt es und setzt den Fokus nur dann auf den Auslöser zurück, wenn er zuvor in der Vorschau lag.

## Profilaktionen bestätigen

Löschen, Entfolgen und Blockieren erfordern eine Bestätigung. Abbrechen behält Beitrag oder Beziehung. Die Schritte für Beiträge und soziale Aktionen erklären diese Auswahl in allen unterstützten Sprachen. Ziele, Reihenfolge, Fortschritt und Abschlusskennungen bleiben unverändert.
