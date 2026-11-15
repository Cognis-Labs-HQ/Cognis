# Verwaltungsentscheidungen

**Feature-Zweig:** feature-admin-confirmation-intent

## Verwaltungsentscheidungen

Dialoge zum Deaktivieren stellen das neutrale Abbrechen voran und kennzeichnen Deaktivieren als destruktiv. Aktivieren bleibt eine positive Aktion. Abbrechen, Schließen und Escape ändern den Komponentenstatus nicht. Laufende Steuerelemente starten denselben Vorgang nicht erneut. Das Verlassen der Komponentenansicht, eine neue Verwaltungsseite oder ein Sitzungswechsel bricht noch nicht gesendete Arbeit ab. Bereits gesendete Anfragen lassen sich nicht rückgängig machen. Abgelehnte Anfragen stoppen abhängige Änderungen. Bei einem unklaren Ergebnis oder einem Lesefehler nach angenommenen Änderungen bleibt das Steuerelement bis zum erneuten Laden der Verwaltung gesperrt. Bei ungespeicherten Änderungen ist Bleiben neutral und Verwerfen und fortfahren destruktiv; nur Letzteres entfernt den Entwurf.

Komponentenentscheidungen erfordern gültige Kennungen und eindeutige aktuelle Zustände. Ungültige Bestandsantworten erlauben weder eine Deaktivierungsfolge noch die Freigabe eines Steuerelements nach einer angenommenen Änderung.

Einzeln gesperrte Adapter werden weiterhin von ihrem Gateway verwaltet. Gateway-Aktionen senden für sie keine einzelnen Änderungen und bieten sie nicht zur Aktivierung einzelner Adapter an.

## Commits

- [cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/cbeb8ddade3166c6f2831b5371bf354b4c6c8b1a)
- [da2f1f42738a2b3d61fa73a9624fb670557382ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/da2f1f42738a2b3d61fa73a9624fb670557382ad)
- [40d08231edb4630d69d1178097a50b06f3f05fd9](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d08231edb4630d69d1178097a50b06f3f05fd9)
- [5be1992292d6d641d75805fe58a48c5555cc7940](https://github.com/Cognis-Labs-HQ/Cognis/commit/5be1992292d6d641d75805fe58a48c5555cc7940)
- [cc01b0af6c503b4e1b54b4e0cc040d22363d1c89](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc01b0af6c503b4e1b54b4e0cc040d22363d1c89)
- [a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0dd4227a060dddb0c73d043e39dfb0cbe4e90ae)
