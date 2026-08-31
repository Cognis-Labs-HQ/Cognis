# Share-Freigaben absichern und stufenweise ausführen

**Feature-Zweig:** work

## Kontext im Freigabe-Popup maskieren

Werte für Antragsteller, Aktion und Ziel werden nun HTML-maskiert, bevor sie im Dashboard einer genehmigenden Person dargestellt werden.

## Freigabe-Orchestrierung als Flow bereitstellen

Die Share-Freigabefähigkeit führt nun einen benannten Flow mit expliziten Stufen für Zielauflösung, Antragserstellung, Warten auf Antworten und Entscheidung aus, sodass Komponenten entfernbare Hooks einfügen können.

## Implementierungsänderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/1452294f
