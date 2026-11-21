# Anwendung

Praktische Abläufe für E-Mail-Zustellung.

## Voraussetzungen

Administratoren benötigen SMTP-Zugang und eine erlaubte Absenderadresse.

## Beispiele

Gib Host, Port, Verschlüsselung und Absender ein; sende vor regulärer Zustellung eine Testmail.

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## Erwartete Ergebnisse

Ein erfolgreicher Test bestätigt diese Zustellung; Kontomails beachten weiterhin Bestätigung und Kategorien.

## Fehlerbehebung

Prüfe Testfehler, TLS-Modus, Zugangsdaten und Postfach. Erfolgreiche Verbindung garantiert keine Posteingangszustellung.
