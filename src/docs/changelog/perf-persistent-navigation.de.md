# Beständige Navigation

**Feature Branch:** perf-persistent-navigation

## Beständige Navigation

Beim Routenwechsel überdeckt die Ladeanzeige den betroffenen Arbeitsbereich; Kopfbereich und Navigation bleiben sichtbar. Direkte Dokumentaufrufe behalten die ganzseitige Ladeanzeige. Überholte Navigationen geben ihre Ladefreigabe sofort zurück. Ausstehende Inhalte und Laufzeitfehler bleiben über die vorhandenen Lade- und Fehleranzeigen erkennbar.

Bei jedem Aufbau werden aktuelle Einstellungen einmal gemeinsam für Design- und Sprachsteuerung geladen. Nach Bereitschaft der Anbieter erfolgt eine Avatar-Aktualisierung. Unveränderte Avatar-Elemente bleiben bestehen. Verspätete Ergebnisse werden nach Konto-, Token-, Anbieter- oder Aktualisierungswechsel verworfen. Private Antworten werden nicht zwischengespeichert.

## Commits
