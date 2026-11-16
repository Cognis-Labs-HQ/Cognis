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

## Lesbare mobile Inhalte

Auf Telefonen und Tablets stehen Profilidentität, Beitragserstellung und Beiträge vor weiteren sozialen Bereichen. Lange Namen, Biografien und Beiträge passen sich der verfügbaren Breite an. Beim vollen Banner steht die Identität unter dem Bild; Felder und Entwürfe bleiben bei Größenänderungen erhalten.

Die Vorschau zeigt vor dem Veröffentlichen den aktuellen Titel und Text. Wechsle zurück zum Schreiben oder drehe das Gerät, ohne den Entwurf zu verlieren.

Veröffentlichte Beiträge erscheinen sofort; nach dem Löschen wird die Beitragsliste ohne Neuladen aktualisiert.
