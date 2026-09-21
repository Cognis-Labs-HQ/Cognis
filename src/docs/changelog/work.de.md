# Bibliothek und Sicherheit

**Feature-Zweig:** work

## Fokussierte Bibliotheksmodule

Der Einstiegspunkt des Study-Library-Browsers ist jetzt ein kleiner Seitenkoordinator. Kartenrendering, Ebenenraster, Detail-Popups, Auswahl, Browserinteraktionen und Varianteninteraktionen liegen in fokussierten Modulen mit ungefähr 100–200 Zeilen, wobei das bestehende UI-Verhalten erhalten bleibt.

## Atomare Fortschrittskorrekturen

Gewöhnliche Fortschrittsereignisse können keine Kompensationskennungen mehr einschleusen. Korrekturen verwenden die dafür vorgesehene Operation, und der persistente Ereignisspeicher garantiert atomar höchstens eine Korrektur pro Ziel.

## Autorisiertes Löschen

Beim Löschen aus der Bibliothek werden nun die endgültige Kaskade ermittelt und alle betroffenen Einträge innerhalb der Löschtransaktion autorisiert. Damit ist die Lücke zwischen Autorisierung und gleichzeitigen Beziehungsänderungen geschlossen.

## Stärkere Modulgrenzen

Die Prüfung externer Module lehnt symbolische Verknüpfungen für Quellcode, Verzeichnisse (einschließlich Namen mit Punkten) und Assets außerhalb der Modulgrenze ab. Sichere modulinterne Asset-Verknüpfungen bleiben nutzbar. Geschützte UI-Klassen in Klassenattributselektoren werden ebenfalls erkannt.

## Zweitschreibweisen im Titel

Alternative Schreibweisen von Wörtern und Sätzen erscheinen nun als navigierbarer sekundärer Titelinhalt direkt unter der primären Schreibweise. Zeichenartige strukturelle Varianten werden im Detailinhalt nicht mehr wiederholt.

## Eindeutige Aussprachetitel

Primäre und sekundäre Schreibweisen werden nicht mehr als Aussprachemetadaten wiederholt. Aussprachen bleiben einfacher Titeltext und werden nie heuristisch in Links zu Schreibeinträgen umgewandelt, sodass angezeigte Beziehungen ausschließlich den vom Modul bereitgestellten Bibliotheksgraphen widerspiegeln.

## Korrekte Bibliotheksbeziehungen und Inhaltspakete

Löschvorschauen berücksichtigen jetzt Kaskaden-, Trennungs- und Einschränkungsrichtlinien, ohne abhängige Einträge als ausdrücklich ausgewählte Löschungen zu behandeln. Verborgene oder platzierte Einträge bleiben aus der Popup-Reihenfolge ausgeschlossen. Aktualisierungen von Inhaltspaketen bewahren ausgelassene Anbietereinträge standardmäßig; Herausgeber können eine maßgebliche Bereinigung ausdrücklich anfordern.

## Dauerhaftes und deterministisches Fortschrittsverhalten

Fortschrittswiederholungen vergleichen Ereignisse strukturell, gleiche Zeitstempel verwenden Ereignis-IDs als deterministische Entscheidung, unsichere Extremdaten werden vor der Speicherung abgelehnt, fehlerhaftes JSON liefert einen Clientfehler und deaktivierte Adapter sperren ihre Fähigkeiten und Ablauf-Hooks.

## Vollständige Prüfung von Modul-Stylesheets

Die Prüfung externer Module erkennt nun direkte URLs zu Cognis-Interna sowohl in CSS-Importen und Asset-URLs als auch in Skripten.

## Sichere Grenzen für Wiederholungsdaten

Fortschrittsprojektionen begrenzen Wiederholungsintervalle jetzt auf vierzehn Tage. Dies entspricht der Prüfung von Ereigniszeitstempeln und stellt sicher, dass jedes angenommene Ereignis rekonstruierbar bleibt.

## Zuverlässige Dashboard-Navigation

Die programmgesteuerte Dashboard-Navigation verwendet nun den allgemeinen Hook zur Routenautorisierung statt entfernter Study-spezifischer Hilfsfunktionen. Dadurch scheitert die Navigation nicht mehr an einem Referenzfehler.

## Einheitliche englische Paketnamen

Die Versionsverzeichnisse verwenden nun in allen Sprachvarianten die kanonischen englischen Paketnamen, während die umgebende Dokumentation lokalisiert bleibt.

## Zuverlässige gezielte Modulaktivierung

Bei der Modulaktivierung gilt während der strikten Laufzeitaktualisierung nun nur das angeforderte Modul als zwingend. Dadurch können unabhängige ungültige oder deaktivierte Module eine gültige Aktivierung – einschließlich Study-Sprachmodulen – nicht mehr zurückrollen. Deaktivierte Konfigurations-Bootstraps prüfen nur ihren serverseitigen API-Quellbaum; vor der Aktivierung bleibt die vollständige Grenzprüfung verpflichtend.

## Kompatibilität privilegierter Module wiederhergestellt

Der Kompatibilitätsvertrag der Entwicklungsbasis für privilegierte Module ist wiederhergestellt: Privilegierte Module können ihre deklarierten Host-Laufzeitintegrationen verwenden, ohne von der neueren Grenzprüfung für nicht privilegierte Module abgelehnt zu werden. Nicht privilegierte Module werden weiterhin vollständig geprüft, und moduleigene Tests laufen für beide Klassen.

## Fokussierte Study-Bibliotheksseiten

Detaillierte Darstellungen der Bibliotheksebenen werden nun als eigene Seiten aus der Study-Unternavigation geöffnet. Die Bibliothekswurzel für Administratoren verwendet einen kompakten, einheitlichen Ebenenindex mit Eintragszahlen, und das Study-Untermenü enthält nun eine lokalisierte Bestenlistenseite.

## Zuverlässige Study-Seiten und fokussierte Bibliothekskarten

Spezifischere Adapter-SPA-Routen haben nun Vorrang vor allgemeinen untergeordneten Gateway-Routen, sodass die Bestenliste korrekt eingebunden wird. Fehlt ein optionales Übersetzungsbündel, verwendet die Study-Navigation die bereitgestellte Ersatzbezeichnung. Bibliotheksvorschauen konzentrieren sich auf Eintrag und Aussprache, während Detailkarten Aussprachen, Definitionen, Metadaten, Beziehungen und Beispiele zeigen.

## Erweiterbare Wertung, Erfolge und Live-Wettbewerbe

Core orchestriert nun die sammlungsbasierte EP-Wertung mit Anbieterschwierigkeit, Aktivitätsgewichtungen, zeitgerechtem Abschluss, Erstabschluss- und diskreten Wiederholungsbelohnungen, begrenzten globalen beziehungsweise anbieterspezifischen Multiplikatoren, einlösbaren Boostern und persönlichen Bestleistungen. Anbieter können dynamische normale, seltene und legendäre Erfolge registrieren; deren nachweisgestützte Auszeichnungen unveränderlich sind und auf zulässigen Profilen erscheinen. Study wandelt geprüfte Progress-Ereignissammlungen in Bestenlisten-EP um, stellt Live-Ranglisten für persönliche, Ereignis- und Klassendefinitionen bereit und animiert nachträgliche Rangänderungen unter Beachtung reduzierter Bewegung.

## Öffentliche Engagement-Verträge für Anbieter

Core veröffentlicht Wertung, Achievement-Registrierung und Aktivitätsaufzeichnung nun über `ctx`; die Study-Bestenliste veröffentlicht ihren Anbietervertrag auf demselben Weg. Die Wertung prüft jetzt begrenzte Anbietereingaben, eindeutige Evidenz, Zeitziele und durch Hinweise unterstützte Belohnungen. Neue lokalisierte Komponentendokumentation erläutert Registrierung, Flow-Erweiterung, Evidenzprüfung, Datenschutz und saisonalen Bestenlistenbetrieb.

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
- [799fc33d](https://github.com/Cognis-Labs-HQ/Cognis/commit/799fc33d)
- [d472ffa9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d472ffa9)
- [992973f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/992973f5a421fa0043bfa792a1b4757abcff8209)
- [4c7366ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c7366adec02748038211fcdf407f8b5b2ea759e)
- [2b097121](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b097121)
- [223044e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/223044e0)
- [5ae64121](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ae64121)
- [504e4b2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/504e4b2b)
- [a0f0832a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0f0832a)
- [8d78ecd3](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d78ecd3)
- [633e2579](https://github.com/Cognis-Labs-HQ/Cognis/commit/633e2579)
- [73464474](https://github.com/Cognis-Labs-HQ/Cognis/commit/73464474)
