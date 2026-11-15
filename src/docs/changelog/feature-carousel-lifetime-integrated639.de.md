# Karussell-Auswahl schützen

**Feature-Zweig:** feature-carousel-lifetime-integrated639

## Beendete Auswahl unverändert lassen

Ausstehende Karussellaktivierungen ändern nach dem Abbruch durch ihren Besitzer weder Elementkennung, Beschriftung, Auswahl, Barrierefreiheitszustand noch Zähler. Beendete Callbacks benachrichtigen den früheren Besitzer nicht und überschreiben keine Auswahl einer neuen Einbindung im selben Wurzelelement.

## Bestehende Karussellaktionen erhalten

Aktive synchrone und asynchrone Aktivierung, Auswahlablehnung durch false, geordnete Auswahl mit gemeinsamen Kennungen, Hinzufügen und Vorschauabbau behalten ihr Verhalten. Ziele und Ablauf bestehender Erstellungstutorials bleiben erhalten. Arbeit innerhalb der Besitzer-Callbacks wird weder abgebrochen noch rückgängig gemacht; die gemeinsame UI hat keine eigene Komponentenversion.

## Commits

- [2f8afd8a8370dcf266dc52872a9a2be71dacd476](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f8afd8a8370dcf266dc52872a9a2be71dacd476)
