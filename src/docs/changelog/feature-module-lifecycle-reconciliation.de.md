# Ergebnisse von Modulaktionen

**Feature-Zweig:** feature-module-lifecycle-reconciliation

## Ergebnisse von Modulaktionen

Aktivieren und Deaktivieren bleiben während der Änderungsanfrage und einer anschließenden Zustandsprüfung beschäftigt. Eine Abfrage zeigt den aktuell beobachteten Zustand, nicht ob genau diese Anfrage übernommen wurde. Das Verlassen der Modulseite bricht eine bereits gesendete Änderung nicht ab. Die alte Seite darf weder verspätete Meldungen anzeigen noch eine neue Ansicht verändern. Ein Kontowechsel entwertet wartende Aktionen und späte Ergebnisse. Geht eine Antwort verloren, erfolgt genau eine neue Zustandsabfrage mit fünf Sekunden Zeitlimit, keine automatische Wiederholung der Änderung. Bei unklarem Ergebnis ersetzt Zustand prüfen die Modulaktionen. Weitere Abfragen und SPA-Besuche lassen die Aktionen gesperrt, solange der entgegengesetzte Zustand vorliegt. Die Aktionen kehren erst zurück, wenn der angeforderte Zustand beobachtet wird. Optionale Einrichtungshinweise und abgebrochene Katalogabfragen machen eine bestätigte Aktivierung nicht zum Fehler. Abgebrochene Pflichtkonfiguration wird einmal zurückgenommen. Geht die Antwort darauf verloren, wird die Rücknahme nur dann als deaktiviert abgeglichen, wenn eine verbindliche Abfrage diesen Zustand zeigt. Andernfalls bleibt das Ergebnis unbekannt.

Die Marktplatz-Tutorials zeigen Zustand prüfen nur bei verfügbarem Bedienelement und überspringen normale Modulaktionen bei unklarem Ergebnis. Bestehende Eigentümer- und Abschlusskennungen sowie die Popup- und Tutorial-Lebensdauer der Konfiguration bleiben erhalten. Die Modulseite besitzt kein separat versioniertes Komponentenpaket oder Manifest. API-, Core- und Anbieter-Versionen sowie Hashwerte ändern sich nicht.

Abgeglichene Lebenszyklusereignisse sind als observed-state gekennzeichnet, bestätigte Antworten als acknowledged-response. Ein beobachteter Zustand beweist nicht, dass genau diese Anfrage übernommen wurde. Die API bietet keinen dauerhaften Vorgangsbeleg. Ungeklärte Zustände bleiben bei SPA-Wechseln erhalten, nicht bei einem vollständigen Neuladen des Browsers. Danach ist nur der aktuelle Serverzustand bekannt; das endgültige Ergebnis der früheren Anfrage und der tatsächliche Study-Start bleiben unbestätigt.

Ein Modul kann keine Abhängigkeit erfüllen, solange eine Modulaktion läuft oder ihr Ergebnis ungeklärt ist. Das gilt auch für Deaktivierung und die Rücknahme einer Einrichtung. Wiederholte Aktionen und SPA-Wechsel behalten diese Sperre bei; eingereihte Aktivierungen prüfen die Bereitschaft beim tatsächlichen Start erneut, ohne die Auswahl optionaler Abhängigkeiten zu wiederholen. Beobachtete Aktivierung ist kein Nachweis einer abgeschlossenen Einrichtung. Auch eine abgelehnte Rücknahme lässt die Einrichtung unvollständig. Das Speichern der Einstellungen kann die Einrichtung bestätigen, aber keine ungewisse Änderung klären. Ein verbindlich beobachteter, erwarteter deaktivierter Zustand erlaubt die gewöhnliche ausdrückliche Aktivierung.

Fehlende Übersetzungen für Warnungen zur Bereitschaft von Abhängigkeiten lösen auch bei wiederholten Aktionen einen ausdrücklichen Fehler aus, statt internen Fehlertext anzuzeigen. Die Schaltfläche wird danach aus dem Ladezustand zurückgesetzt.

Einstellungen, Aktualisierungen und Kanalwechsel nutzen dieselben kontogebundenen Prüfungen für laufende Aktionen und ihre Ergebnisse, einschließlich vorübergehender Aktivierung, Deaktivierung und Rücknahme. Jede Aktivierung und Wiederherstellung prüft die ausgewählten Abhängigkeiten erneut. Eine Wiederherstellung nach Installation ist nur bei eindeutig abgelehnter Einreichung oder bestätigtem abschließendem Auftragsergebnis zulässig. Verlorene Anfrage- oder Statusantworten und fehlende Auftragsbelege bleiben ungeklärt; es erfolgt weder Wiederherstellung noch Wiederholung. Eine Installation mit verlorenem Ergebnis bleibt für die Seitensitzung gesperrt. Zustand prüfen aktualisiert den Katalog, beweist aber keinen Auftragsabschluss. Vollständiges Neuladen verwirft diese lokale Unsicherheit, ohne einen Abschluss zu belegen. Dauerhafte Auftragsbelege und Wiederherstellung nach vollständigem Neuladen werden nicht hinzugefügt.

## Commits

- [9a0290cfd75a5a56679e3217a5cb5f5825246174](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a0290cfd75a5a56679e3217a5cb5f5825246174)
- [f721c2f72d1d73228f4d1dd2cb7f027e065e27c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/f721c2f72d1d73228f4d1dd2cb7f027e065e27c8)
- [e632fac6ba342fe403c0a2fb4ce82d5a7dde816a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e632fac6ba342fe403c0a2fb4ce82d5a7dde816a)
- [56d32ec39813023e57e3cfcd5b2a05b2ed73fb27](https://github.com/Cognis-Labs-HQ/Cognis/commit/56d32ec39813023e57e3cfcd5b2a05b2ed73fb27)
- [4eb495fdc16c8bf8ae39a8a28d605244dd8a868f](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb495fdc16c8bf8ae39a8a28d605244dd8a868f)

- [ee4ea4b80851aa7706cea39c29dd97be27575e61](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee4ea4b80851aa7706cea39c29dd97be27575e61)
