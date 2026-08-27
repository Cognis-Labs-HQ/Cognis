# Zuverlässige Modultexte

## Keine Abfragen fehlender Texte

Der Modulkatalog gibt Lokalisierungsressourcen nur noch bekannt, nachdem die erforderliche englische Textdatei im Servercache bestätigt wurde. Die regelmäßige Marktplatzabfrage wiederholt daher keine Anfragen an Textadressen mehr, die nur 404 zurückgeben können.

## Unvollständige Modulcaches erkennen

Die API protokolliert eine strukturierte Warnung mit Modul, Sprache und Ressourcenkennung, wenn ein Modul Lokalisierung deklariert, aber die englische Ressource im Cache fehlt. Eine erneute Quellensuche kann den Cache auffüllen; Modulautoren müssen weiterhin `ui/languages/en/strings.xml` und die übrigen unterstützten Übersetzungen bereitstellen.
