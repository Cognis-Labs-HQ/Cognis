# CLI-Einladungsversand

**Feature-Zweig:** feature-cli-invite-integration

## Token ohne E-Mail erzeugen

Der Registrierungstoken-Befehl fordert die manuelle Zustellung über den aktuellen Vertrag der Registrierungs-API an. Er erwartet kein E-Mail-Argument und gibt einen Registrierungslink ohne E-Mail-Versand zurück. Der E-Mail-Einladungsbefehl fordert ausdrücklich die E-Mail-Zustellung an. Bestehende Berechtigungs- und Domainbeschränkungen gelten weiterhin.

## Befehlsergebnisse prüfen

Tests mit den tatsächlichen Routen prüfen anonyme und adressgebundene Ausstellung, ungültige Eingaben, fehlende Berechtigungen, Domainbeschränkungen und die beabsichtigte Linkausgabe ohne Links in Protokollen. CLI-Version 0.4.3 enthält Registrierungstoken-Adapter 0.1.42. Zurückgegebene Links sind Geheimnisse; die ausführliche Ausgabe zeigt gekürzte Links vollständig.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b460321c4fa15861829de7ca1502cfa9bdfc18a9
