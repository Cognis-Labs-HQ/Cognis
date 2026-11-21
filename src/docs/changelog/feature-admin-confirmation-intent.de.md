# Verwaltungsentscheidungen

**Feature-Zweig:** feature-admin-confirmation-intent

## Verwaltungsentscheidungen

Dialoge zum Deaktivieren stellen das neutrale Abbrechen voran und kennzeichnen Deaktivieren als destruktiv. Aktivieren bleibt eine positive Aktion. Abbrechen, Schließen und Escape ändern den Komponentenstatus nicht. Laufende Steuerelemente starten denselben Vorgang nicht erneut. Das Verlassen der Komponentenansicht, eine neue Verwaltungsseite oder ein Sitzungswechsel bricht noch nicht gesendete Arbeit ab. Bereits gesendete Anfragen lassen sich nicht rückgängig machen. Abgelehnte Anfragen stoppen abhängige Änderungen. Bei einem unklaren Ergebnis oder einem Lesefehler nach angenommenen Änderungen bleibt das Steuerelement bis zum erneuten Laden der Verwaltung gesperrt. Bei ungespeicherten Änderungen ist Bleiben neutral und Verwerfen und fortfahren destruktiv; nur Letzteres entfernt den Entwurf.

Komponentenentscheidungen erfordern gültige Kennungen und eindeutige aktuelle Zustände. Ungültige Bestandsantworten erlauben weder eine Deaktivierungsfolge noch die Freigabe eines Steuerelements nach einer angenommenen Änderung.

Einzeln gesperrte Adapter werden weiterhin von ihrem Gateway verwaltet. Gateway-Aktionen senden für sie keine einzelnen Änderungen und bieten sie nicht zur Aktivierung einzelner Adapter an.

## Commits

- [b83b0b66dde15749c76b9457dbfe29fb82648141](https://github.com/Cognis-Labs-HQ/Cognis/commit/b83b0b66dde15749c76b9457dbfe29fb82648141)
- [d116af6da9b6b1ea00f7798a61474071693ed724](https://github.com/Cognis-Labs-HQ/Cognis/commit/d116af6da9b6b1ea00f7798a61474071693ed724)
