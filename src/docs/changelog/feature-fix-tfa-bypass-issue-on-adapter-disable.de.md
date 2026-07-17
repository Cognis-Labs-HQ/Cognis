# Anmeldung bei deaktiviertem TFA-Adapter

## Deaktivierte TFA-Adapter blockieren die Anmeldung nicht mehr

Wenn ein Administrator einen TFA-Adapter deaktiviert, den Nutzer zuvor eingerichtet hatten, behandelt die Anmeldung diese Methoden nun als nicht für die Erzwingung verfügbar und überspringt TFA, statt einen Fehler wegen vorübergehender Nichtverfügbarkeit zurückzugeben.
