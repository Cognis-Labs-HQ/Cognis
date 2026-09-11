# Sichere Study- und Modul-Lebenszyklen Durchsetzen

**Feature-Zweig:** work

## Löschregeln Für Bibliotheksbeziehungen Beachten

Die Löschplanung der Bibliothek beachtet nun die Schema-Regel `restrict`, `detach` oder `cascade` jeder Beziehung, statt jeden eingehenden Verweis als Kaskade zu behandeln.

## Progress-Persistenz Innerhalb Des Flows Ausführen

Der Progress-Adapter speichert Ereignisse dauerhaft und baut Projektionen in den vorgesehenen Stufen `persist` und `project` neu auf, sodass spätere Erweiterungen bestätigten Zustand sehen.

## Lücken In Der Modulvalidierung Schließen

Die Grenzprüfung erkennt nun statische CommonJS-Aufrufe von `require()` und prüft das gesamte Modul, bevor ein deaktivierter API-Einstiegspunkt geladen wird.

## Kanonische Study-Sprachnavigation Beibehalten

Ein gemerktes Study-Ziel wird nur wiederverwendet, wenn die Zielsprache diese Seite tatsächlich registriert; andernfalls wird ihr deklarierter Standard verwendet.

## Neue Core-UI-Infrastruktur Auf Schutz Prüfen

Die KI-Anweisungen verlangen nun bei neuen oder erweiterten Core-UI-Funktionen, gerenderten Objekten, Komponenten und Klassen ausdrücklich eine Prüfung auf erforderlichen Schutz.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3dadb7fdb2f6269d735e6b8f7d0cdf8991ac5808
