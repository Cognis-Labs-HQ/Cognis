# Ausgereiftere Datei-Namensraum-Kontrollen

**Feature-Zweig:** N/A

## Gehärtete Namensraum-Verträge

Das Datei-Gateway validiert jetzt Namensraum- und Komponentenkennungen bei der Registrierung, normalisiert Zulassungslisten und speichert unveränderliche Namensraumdefinitionen, damit künftige Komponenten einen verlässlichen Namensraum-Vertrag nutzen.

## Sichereres ACL- und Kontingentverhalten

Datei-Lesezugriffe bleiben entsprechend der Namensraum-Obergrenze teilbar, aber Überschreiben und Löschen sind auf Eigentümer oder privilegierte Akteure beschränkt. Kontingentprüfungen berücksichtigen Überschreibungen desselben Eigentümers nun nur mit der resultierenden Größenänderung.

## Änderungen
