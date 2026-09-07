# Zuverlässige Nachrichtenstile

**Feature-Zweig:** feature-fix-test-failures-from-last-pr

## Alle Nachrichtenstile wiederhergestellt

Die Nachrichtenseite lädt bei direkten Aufrufen wieder alle adaptereigenen Stylesheets, entsprechend den für die clientseitige Navigation registrierten Stilen.

## Direkte Stile ohne fragile Tests beibehalten

Wie die Profil- und Klassenseiten besitzt Messages für direkte Aufrufe eine eigenständige HTML-Hülle. Deshalb bleiben ausdrückliche Links erhalten, die den Stilen der SPA-Route entsprechen. Die funktionsspezifischen Tests konzentrieren sich nun auf das dargestellte Verhalten, statt einen bestimmten Lademechanismus vorzuschreiben.

## Änderungen

- [1406a2d](https://github.com/Cognis-Labs-HQ/Cognis/commit/1406a2d7a8e98cca18214cfeeb104b3a5054c876)
- [48522be](https://github.com/Cognis-Labs-HQ/Cognis/commit/48522be12b3e38476cf4622d9eecf466bc74e6b1)
