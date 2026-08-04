# Nachbesserungen bei der Dashboard-Hydrierung

## Optionale Dashboard-Daten blockieren die Navigation nicht mehr

Das Dashboard schließt die Einbindung nun direkt nach dem Rendern des Grundlayouts ab, während Konto-, Kalender- und Erweiterungsdaten unabhängig weitergeladen werden.

## Kalenderanfragen bleiben im Kalender-Gateway

Das Dashboard verwendet die exportierte Funktion des Kalender-Gateways für bevorstehende Ereignisse, sodass Endpunkt- und Antwortdetails in der zuständigen Komponente bleiben.

## Die Versionsanzeige der Authentifizierung ist einheitlich

Die Laufzeitregistrierung der Authentifizierung meldet nun dieselbe Version wie ihr Komponentenmanifest.
