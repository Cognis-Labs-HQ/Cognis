# Bibliotheksadapter

## Zweck

Der Bibliotheksadapter speichert wiederverwendbare, nachverfolgbare Lern- und Aktivitätsmaterialien in der Datenbank. Jeder Eintrag gehört zu einer unveränderlichen Ebene sowie zum globalen, Klassen- oder Benutzerbereich. Leere Ebenen werden in der Oberfläche ausgeblendet.

## Standardebenen

Die Reihenfolge lautet `alphabet`, `alt_characters`, `definitions`, `words`, `sentences`, `exercises`, `workouts`, `routines` und `collections`. Verweise sind gerichtete Kanten zu zulässigen Bausteinen niedrigerer Ebenen; Sammlungen dürfen jede Ebene außer anderen Sammlungen gruppieren.

## Vorlagen für Verbraucher

Verbraucher rufen über die `study:library`-Fähigkeit von `ctx` die Funktion `cloneTemplate` mit genau den benötigten Ebenen auf. Ein Sprachmodul kann dadurch ausschließlich `alphabet`, `alt_characters`, `definitions`, `words` und `sentences` anfordern. Die Kopie behält die kanonische Reihenfolge bei, entfernt Verknüpfungen zu nicht angeforderten Ebenen und kennzeichnet erforderliche Verknüpfungen. Beim Erstellen von Wörtern und Sätzen können passende Zeichen beziehungsweise durch Leerraum getrennte Wörter automatisch verknüpft werden.

## Zugriff und Austausch

Globale Daten sind lesbar, aber nur Administratoren und Eigentümer dürfen sie ändern oder JSON importieren. Klassen sind für Lehrkraft und aktive Mitglieder lesbar und nur für die Lehrkraft sowie Administratoren beschreibbar. Der Benutzerbereich ist privat. `study:library` stellt Lesen, Schreiben, Verfolgen, Push-Anfragen sowie JSON- und Anki-Import/Export über `ctx` bereit.
