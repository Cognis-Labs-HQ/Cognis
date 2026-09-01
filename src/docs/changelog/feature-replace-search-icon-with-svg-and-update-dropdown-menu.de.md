# Klarere Navigationssteuerelemente

**Feature-Zweig:** feature-replace-search-icon-with-svg-and-update-dropdown-menu

## Themeabhängiges Suchsymbol

Die globale Suche verwendet nun ein größeres, scharfes SVG-Symbol mit eigenen Varianten für das helle und dunkle Theme.

## Aktive Kontomenüsteuerung

Die Konto-Avatar-Schaltfläche zeigt ihren aktiven Zustand an, solange das Benutzermenü geöffnet ist. Außerdem hebt das Menü den Link der aktuellen Seite dauerhaft hervor.

## Vollständige Changelog-Anleitung

Die Anweisungen für Mitwirkende und KI verlangen nun ausdrücklich lokalisierte Metadaten zum Feature-Zweig und einen abschließenden Abschnitt mit Commit-Links. Damit entsprechen sie dem im Repository geprüften Changelog-Format.

## Zuverlässige Moduloperationen

Die Aktualisierung des Modulkatalogs zeigt nun das standardmäßige drehende Fortschrittsrad, verhindert parallele Aktualisierungen und stellt anschließend das Aktualisierungssymbol wieder her. Modul-Lebenszyklusaktionen werden in eine Warteschlange gestellt, sodass schnell gestartete Aktionen für verschiedene Module der Reihe nach abgeschlossen werden, anstatt sich gegenseitig zu unterbrechen.

## Präzise dauerhafte Navigationszustände

Das Benutzermenü unterstreicht nun nur den spezifischsten Link der aktuellen Seite. Dadurch markiert die Modulseite nicht mehr gleichzeitig die Administration als aktuell. Das Stylesheet des Suchsymbols bleibt im Dashboard bestehen, sodass das Symbol auch nach SPA-Navigation sichtbar bleibt.

## Änderungen

- [76d78c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/76d78c25eccda985bf18c81e4c8c05e807d44c38)
- [c3a06c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3a06c8624046512362c1a8341bd4639305506c0)
- [18c3f6b](https://github.com/Cognis-Labs-HQ/Cognis/commit/18c3f6b5bec6c9885a098c610fa67eeba946addc)
- [fb6b6db](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb6b6db813aa143f4d7998657d0a98b25fc063f9)
- [09d7628](https://github.com/Cognis-Labs-HQ/Cognis/commit/09d7628cd763f70ddf69b5d3ad472c52eafeb828)
