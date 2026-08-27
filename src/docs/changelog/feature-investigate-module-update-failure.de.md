# Zuverlässige Modulupdates

## Updates verschieben Prüfungen

Modulupdates ersetzen nun den Checkout, während das Modul deaktiviert ist, und verschieben die Prüfung der Abhängigkeiten in den normalen Aktivierungsablauf. Dadurch führt der vorübergehende Laufzeitzustand eines installierten Moduls bei einem gültigen Commit-Update mit gleicher Version nicht mehr zu HTTP 422; für die Aktivierung bleiben dennoch alle deklarierten Abhängigkeiten erforderlich.
