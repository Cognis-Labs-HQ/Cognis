# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Funktionsdienste.

## Schnittstellen

GatewayBootstrapContext stellt Fähigkeiten, Routen, UI und Lebenszyklus bereit. Gemeinsame Starthelfer führen defineContracts und Adapterstart im Eigentümerbereich aus.

## Konfiguration

Der Host liefert Gateway- und Adapterpfade. Manifeste deklarieren Identität, Version, Abhängigkeiten und Dokumente; Anbieterfelder gehören ins jeweilige Adapterschema.

## Verhalten

Erkennung registriert aktive Eigentümer und Anbieter. Adapter besitzen Verträge, Routen und Rückrufe; fehlgeschlagener Start rollt Registrierungen zurück. Fachdienste bleiben in Gateway-Verzeichnissen.

## Sicherheit

Registrierungsbereiche bestimmen Eigentum statt Benutzerrechte. Aktionen prüfen Anmeldung und Inhaltsrechte; optionale Anbieter veröffentlichen keine fremden privaten Dienste.

## Referenz

- [src/gateways/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/gateways/package.json)
