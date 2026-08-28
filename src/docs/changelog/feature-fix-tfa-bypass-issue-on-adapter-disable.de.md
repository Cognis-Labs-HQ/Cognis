# Anmeldung bei deaktiviertem TFA-Adapter

**Feature Branch:** feature-fix-tfa-bypass-issue-on-adapter-disable

## Deaktivierte TFA-Adapter blockieren die Anmeldung nicht mehr

Wenn ein Administrator einen TFA-Adapter deaktiviert, den Nutzer zuvor eingerichtet hatten, behandelt die Anmeldung diese Methoden nun als nicht für die Erzwingung verfügbar und überspringt TFA, statt einen Fehler wegen vorübergehender Nichtverfügbarkeit zurückzugeben.

## Commits

- [5b67ac9](https://github.com/Cognis-Labs-HQ/Cognis/commit/5b67ac95fe2b594f8b76c38d73dfdf5adf945dbf)
