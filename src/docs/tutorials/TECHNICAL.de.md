# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Geführte Anleitungen.

## Schnittstellen

Komponenten beziehen `ui:tutorials` aus Browser-ctx. Der Host installiert über installTutorials; Aktionen nutzen `ui:tutorial:*`-Abläufe. Page Composer liefert seitengebundene Anleitungen ohne interne Fremdimporte.

## Konfiguration

Anleitungen deklarieren stabile Eigentümer-, Guide- und Schritt-IDs, Übersetzungen, Seiten, Ziele und highlightNext. Optionale Zweige nutzen targetAvailable und Öffnungssignale; Sprachanleitungen benötigen Einschreibung.

## Verhalten

Seitenerkennung wartet auf Kontoabschlüsse und überspringt abgeschlossene Guides. Wiederholung löscht keinen Abschluss. Zurück und Neustart behalten das Beispiel; Abbruch und Seitenende räumen Ziele auf. Abschluss gilt erst nach erfolgreichem Speichern.

## Sicherheit

Sichtbarkeit und Bedingungen beachten Rollen und Inhaltszugriff. Fehlgeschlagene Abschlussabfragen sind Fehler statt automatischer Wiederholungsfreigabe; Fortschritt gehört zum authentifizierten Konto.

## Referenz

- [src/ui/reuse/tutorials/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/index.js)
- [src/ui/reuse/tutorials/runtime.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/runtime.js)
