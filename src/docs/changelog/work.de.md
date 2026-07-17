# Namespace File Clients

## Namespace-bound file clients

Das Datei-Gateway stellt jetzt `files:namespace` bereit, eine `ctx`-Fähigkeit, die einen an Komponente und Namensraum gebundenen Client zurückgibt, sodass reguläre Dateioperationen Namespace- und Aufrufer-Metadaten nicht mehr an jeder Aufrufstelle wiederholen müssen.

## Share gateway controls

Das Share-Gateway besitzt jetzt Kontrollen für Lese-/Schreibberechtigungen, In-App-Benutzer, Gruppen/Klassen, E-Mail-Empfänger, passwortgeschützte Links, generierte Passwörter, bearbeitbare Ablauf-/Berechtigungsänderungen und Wasserzeichen-Metadaten für schreibgeschützte Freigaben. Jitsi Meet und Nextcloud Whiteboard erstellen, listen und löschen Freigaben nun über die generischen Token-Routen des Share-Gateways statt über modulspezifische Freigabe-Endpunkte.
