# Verwaltungsentscheidungen

**Feature-Zweig:** feature-admin-confirmation-intent

## Verwaltungsentscheidungen

Dialoge zum Deaktivieren stellen das neutrale Abbrechen voran und kennzeichnen Deaktivieren als destruktiv. Aktivieren bleibt eine positive Aktion. Abbrechen, Schließen und Escape ändern den Komponentenstatus nicht. Laufende Steuerelemente starten denselben Vorgang nicht erneut. Das Verlassen der Komponentenansicht, eine neue Verwaltungsseite oder ein Sitzungswechsel bricht noch nicht gesendete Arbeit ab. Bereits gesendete Anfragen lassen sich nicht rückgängig machen. Abgelehnte Anfragen stoppen abhängige Änderungen. Bei einem unklaren Ergebnis oder einem Lesefehler nach angenommenen Änderungen bleibt das Steuerelement bis zum erneuten Laden der Verwaltung gesperrt. Bei ungespeicherten Änderungen ist Bleiben neutral und Verwerfen und fortfahren destruktiv; nur Letzteres entfernt den Entwurf.

Komponentenentscheidungen erfordern gültige Kennungen und eindeutige aktuelle Zustände. Ungültige Bestandsantworten erlauben weder eine Deaktivierungsfolge noch die Freigabe eines Steuerelements nach einer angenommenen Änderung.

Einzeln gesperrte Adapter werden weiterhin von ihrem Gateway verwaltet. Gateway-Aktionen senden für sie keine einzelnen Änderungen und bieten sie nicht zur Aktivierung einzelner Adapter an.

## Commits

- [8eb94e34f3747bcab037af29ae0e323650611fbd](https://github.com/Cognis-Labs-HQ/Cognis/commit/8eb94e34f3747bcab037af29ae0e323650611fbd)
- [d7172168d2beab6bbd86d6e689a65d27fdaafa00](https://github.com/Cognis-Labs-HQ/Cognis/commit/d7172168d2beab6bbd86d6e689a65d27fdaafa00)
