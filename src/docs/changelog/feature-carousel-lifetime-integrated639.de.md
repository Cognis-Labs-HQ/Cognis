# Karussell-Auswahl schützen

**Feature-Zweig:** feature-carousel-lifetime-integrated639

## Beendete Auswahl unverändert lassen

Ausstehende Karussellaktivierungen ändern nach dem Abbruch durch ihren Besitzer weder Elementkennung, Beschriftung, Auswahl, Barrierefreiheitszustand noch Zähler. Beendete Callbacks benachrichtigen den früheren Besitzer nicht und überschreiben keine Auswahl einer neuen Einbindung im selben Wurzelelement.

## Bestehende Karussellaktionen erhalten

Aktive synchrone und asynchrone Aktivierung, Auswahlablehnung durch false, geordnete Auswahl mit gemeinsamen Kennungen, Hinzufügen und Vorschauabbau behalten ihr Verhalten. Ziele und Ablauf bestehender Erstellungstutorials bleiben erhalten. Arbeit innerhalb der Besitzer-Callbacks wird weder abgebrochen noch rückgängig gemacht; die gemeinsame UI hat keine eigene Komponentenversion.

## Commits

- [7e9746dde4b5ce65f426e1baeef8b09bd814c0e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e9746dde4b5ce65f426e1baeef8b09bd814c0e0)
- [7adfa7602f9e74515dacf83ce779572bb8faffc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/7adfa7602f9e74515dacf83ce779572bb8faffc3)
