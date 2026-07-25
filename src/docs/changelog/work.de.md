# Zuverlässiger Start der Modulverwaltung

## Modulrouten vor der Annahme von Anfragen abwarten

Die API schließt nun die Wiederherstellung des Modulstatus und die Registrierung der Erweiterungsrouten ab, bevor Anfragen verarbeitet werden. Dadurch werden vorübergehende 404-Antworten von Konfigurationsendpunkten und fehlgeschlagene direkte Aktivierungsversuche beim Start verhindert.
