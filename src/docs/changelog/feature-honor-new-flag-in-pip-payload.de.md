# Meetings beim Wechsel zu Bild-in-Bild erhalten

**Feature-Zweig:** feature-honor-new-flag-in-pip-payload

## Anforderungen zur Erhaltung des Browsing-Kontexts berücksichtigen

Schwebende Fenster berücksichtigen nun die Anbieteroption `preserveBrowsingContext`. Wenn der Browser eine Komponente nicht mit der zustandserhaltenden DOM-API verschieben kann, belässt Cognis sie unter ihrem bisherigen Elternelement und verwendet dort die oberste Ebene, statt ihren aktiven Iframe neu einzuhängen und eine erneute Meeting-Verbindung zu riskieren.

## Änderungen

- [bae46cbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/bae46cbe55f7352a4fe023e859a2b0502c2fa9db)
