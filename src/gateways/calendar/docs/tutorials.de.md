# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich | Anleitung         | Zugriff             |
| --------------- | ----------------- | ------------------- |
| `/calendar`     | Kalenderanleitung | Angemeldeter Nutzer |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Die Datumsnavigation hebt auch ohne Termine die sichtbaren Datumsaktionen hervor. Die Terminplanung zeigt einen echten Erstellungsplatz statt erneut den ganzen Kalender.

Die Terminplanung behält ihr Ziel auf einem echten Erstellungsplatz und erklärt das breitere Formular, die kompakte Lesereihenfolge und das Scrollen. Der Terminschritt erklärt gestreifte ausstehende Einladungen. Anleitungs-IDs, sechs Schritte, highlightNext-Werte und Seitenlebensdauer bleiben unverändert. Leere Kalender behalten Datumsnavigation und Erstellungsziele.
