# Beständige Navigation

**Feature-Zweig:** perf-persistent-navigation

## Beständige Navigation

Routen- und Dokumentaufrufe verwenden die ganzseitige Ladeanzeige. Überholte Navigationen geben ihre Ladefreigabe sofort zurück; ausstehende Inhalte und Laufzeitfehler behalten die vorhandenen Lade- und Fehleranzeigen.

Die sichtbare Seite behält ihre Routenstile, während das Ziel lädt. Zielstile werden inaktiv vorbereitet und erst beim Austausch des Inhalts aktiviert. Abgebrochene oder fehlgeschlagene Vorbereitungen geben nur ihre eigenen Stile frei. Gemeinsame Steuerelemente und offene Komponentenfenster behalten ihre Stile bis zur Freigabe. Produktionsdokumente bewahren die Quellidentität der Stylesheets, damit direkte Aufrufe und SPA-Navigation dieselbe Zuordnung nutzen.

Die anfängliche Routenzuordnung übernimmt nur deklarierte Routenstile oder Produktionsdokumentstile mit Quellmetadaten. Von Benachrichtigungs- und anderen dauerhaften Anbietern eingefügte Stile bleiben diesen Anbietern zugeordnet, damit ein Routenwechsel die Größenregeln der Benachrichtigungsglocke nicht entfernt.

Bei jedem Aufbau werden aktuelle Einstellungen einmal gemeinsam für Design- und Sprachsteuerung geladen. Nach Bereitschaft der Anbieter erfolgt eine Avatar-Aktualisierung. Unveränderte Avatar-Elemente bleiben bestehen. Verspätete Ergebnisse werden nach Konto-, Token-, Anbieter- oder Aktualisierungswechsel verworfen. Private Antworten werden nicht zwischengespeichert.

## Commits

- [ab071e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab071e280a6109d8d617e006fba9f2fe80419548)
- [efa41cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/efa41cb9a5cdcc671d38888fa89bb6697fa30d03)
- [15ab62e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ab62e625481975126e11f43440311254825e01)
