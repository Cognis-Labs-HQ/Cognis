# Karussell-Auswahl schützen

**Feature-Zweig:** feature-carousel-lifetime-integrated639

## Beendete Auswahl unverändert lassen

Ausstehende Karussellaktivierungen ändern nach dem Abbruch durch ihren Besitzer weder Elementkennung, Beschriftung, Auswahl, Barrierefreiheitszustand noch Zähler. Beendete Callbacks benachrichtigen den früheren Besitzer nicht und überschreiben keine Auswahl einer neuen Einbindung im selben Wurzelelement.

## Bestehende Karussellaktionen erhalten

Aktive synchrone und asynchrone Aktivierung, Auswahlablehnung durch false, geordnete Auswahl mit gemeinsamen Kennungen, Hinzufügen und Vorschauabbau behalten ihr Verhalten. Ziele und Ablauf bestehender Erstellungstutorials bleiben erhalten. Arbeit innerhalb der Besitzer-Callbacks wird weder abgebrochen noch rückgängig gemacht; die gemeinsame UI hat keine eigene Komponentenversion.

## Commits

- [0ff5956143b85559849d3d58491d4e7b14702880](https://github.com/Cognis-Labs-HQ/Cognis/commit/0ff5956143b85559849d3d58491d4e7b14702880)
- [4aa50d65b56dc2ecf4d271516b9a8719bd2519f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/4aa50d65b56dc2ecf4d271516b9a8719bd2519f0)
