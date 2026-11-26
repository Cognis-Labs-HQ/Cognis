# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Mit Personen teilen.

## Schnittstellen

createShareAdapter liefert Methode user mit Kontozustellung. prepare verlangt Empfänger; validateUnique lehnt doppelte Freigaben ab. Die Seite erfordert Anmeldung.

## Konfiguration

Gib Empfänger und erlaubte Inhaltsrechte im Teilen-Dialog an. Zustellung nutzt Cognis-Identitäten statt externer Nachrichtenverbindungen.

## Verhalten

### Verwendungsbeispiele

Gibt eine Ressource über das Share-Gateway direkt für Cognis-Benutzer frei. Der Adapter validiert Benutzerempfänger und verwaltet die Benutzer-Seite im Gateway-Popup.

## Sicherheit

Empfänger müssen ausdrückliche Kontoverweise sein. Leere Empfänger und doppelte Freigaben werden abgelehnt; Share prüft Absender und Inhaltsrechte.

## Referenz

### Technische Spezifikation

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/share/link/technical).
