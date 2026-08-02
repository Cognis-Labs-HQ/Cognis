# Zuverlässige Kalenderfreigaben

## Einladungen und Antworten funktionieren zuverlässig

Über beschreibbare freigegebene Kalender erstellte Termine umfassen nun alle Freigabeempfänger, verknüpfen Benachrichtigungen mit deren Kalendern und erlauben Empfängern mit Lesezugriff, direkt in der freigegebenen Ansicht zu antworten.

## Erneutes Freigeben erhält den Zugriff

Eine erneute Kalenderfreigabe für einen vorhandenen Empfänger setzt Schreibberechtigung und Ablaufzeit nicht mehr zurück.

## Quelldateien erfüllen Architekturgrenzen

Kalender-, Besprechungs- und Whiteboard-Quelldateien wurden ohne Verhaltensänderungen unter die vorgegebene Größenbegrenzung gebracht.

## Freigabefenster wird erfolgreich geladen

Das Linkfreigabefenster lädt seine API-Rückrufe jetzt über den registrierten statischen Pfad des Freigabe-Gateways, anstatt eine fehlende adapterlokale Datei anzufordern.

## Neu erstellte Schlüsselbunde werden bei der Anmeldung wiederhergestellt

Die Sitzungswiederherstellung übernimmt nun vor dem Speichern eines neu erstellten Schlüsselbunds die maßgebliche Kontoinstanz. Dadurch werden Synchronisierungskonflikte bei LDAP-Konten vermieden, deren Schlüsselbundpasswort vom Anmeldepasswort abweicht.
