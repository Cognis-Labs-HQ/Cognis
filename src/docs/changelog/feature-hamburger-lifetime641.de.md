# Lebensdauer von Aktionsmenüs

**Feature-Zweig:** feature-hamburger-lifetime641

## Menüs an ihre Seite binden

Ausstehende und geöffnete Aktionsmenüs schließen, wenn ihre Seite abgebrochen, ihre öffnende Schaltfläche entfernt oder ein neueres Menü geöffnet wird. Alte Bedienelemente können keine Aktion zurückgeben. Benutzer und Module reichen ihre aktuelle Seitenlebensdauer weiter, ohne nachfolgende Aktionen zu ändern.

## Aktionen mit der Tastatur wählen

Menüs fokussieren die erste aktive Aktion und unterstützen Pfeiltasten, Pos1, Ende, Escape und Tab. Escape gibt den Fokus an die aktuelle öffnende Schaltfläche zurück; ein Zeigerklick außerhalb erhält den neuen Fokus. Gemeinsame Verträge für schwebende Menüs und vorübergehende Oberflächen erhalten Tutorial-Reservierungen über gebündelte und direkt ausgelieferte Aufrufer hinweg.

## Dialogfokus beim zuständigen Besitzer halten

Auch ausstehende Menüs werden beim Fokuswechsel abgebrochen, damit eine verzögerte Vorbereitung den Fokus nicht zurückholen kann. Menüs innerhalb eines Dialogs nutzen dessen bestehende delegierte Fokusverwaltung: Navigation und Escape lassen den übergeordneten Dialog offen, der Wechsel zu einem anderen Dialogelement erhält dessen Fokus, und ein neuer verschachtelter Dialog oder das Schließen des übergeordneten Dialogs schließt das Menü.

## Commits

- [d437ae0479f6a2ecc6ca83926275b4779014fdf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/d437ae0479f6a2ecc6ca83926275b4779014fdf3)
- [d3d62fbdd0397e2a982bf1e05cdd1b0126d45597](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d62fbdd0397e2a982bf1e05cdd1b0126d45597)
