# Meetings beim Wechsel zu Bild-in-Bild erhalten

**Feature-Zweig:** work

## Anforderungen zur Erhaltung des Browsing-Kontexts berücksichtigen

Schwebende Fenster berücksichtigen nun die Anbieteroption `preserveBrowsingContext`. Wenn der Browser eine Komponente nicht mit der zustandserhaltenden DOM-API verschieben kann, belässt Cognis sie unter ihrem bisherigen Elternelement und verwendet dort die oberste Ebene, statt ihren aktiven Iframe neu einzuhängen und eine erneute Meeting-Verbindung zu riskieren.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e75a1720
