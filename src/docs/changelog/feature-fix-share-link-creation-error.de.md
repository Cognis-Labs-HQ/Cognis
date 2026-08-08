# Teilen-Popups repariert

## Einheitliches Teilen-Popup

Whiteboards öffnen nun das direkt einsetzbare Popup des Teilen-Gateways mit ihrer Ressourcenkennung und ihren Fähigkeiten und folgen damit derselben Gateway-Integration wie andere Komponenten. Das Gateway bleibt für Teilen-Methoden und Token-Anfragen verantwortlich.

## Anwesenheitsavatare bleiben platziert

Profilbilder der Seitenanwesenheit erhalten ihre Darstellung nun aus dem gemeinsamen Anwesenheits-Stylesheet. Dadurch bleiben sie Avatare in der Werkzeugleiste, statt als unformatierte Bildebenen über der Whiteboard-Zeichenfläche zu erscheinen.

## Share-Gäste bleiben authentifiziert

Beim Öffnen eines Whiteboard-Share-Links bleibt die eingeschränkte Gastsitzung jetzt erhalten. Cognis prüft die temporäre Gastidentität nicht mehr als reguläres Benutzerkonto, löscht ihr Token nicht und meldet nicht mehr, dass das Konto gelöscht wurde.

## Gastgerechte Dashboard-Daten laden

Geteilte Seiten verwenden nun die Gastsitzungsfunktion des Share-Gateways, wenn sie Profil- und Dashboard-Anfragen auswählen. Dadurch schlagen beim geöffneten Whiteboard keine irrelevanten, ausschließlich für Konten bestimmten Anfragen mehr fehl.
