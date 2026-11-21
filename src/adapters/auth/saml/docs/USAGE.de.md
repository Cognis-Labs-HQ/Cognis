# Anwendung

Praktische Abläufe für SAML-Anmeldung.

## Voraussetzungen

Der mitgelieferte SAML-Adapter besitzt keinen eingerichteten Protokollclient. createAdapter() liefert einen leeren Client; die Integration muss über setClient() einen geprüften Client bereitstellen. Konfiguration allein ermöglicht keine Anmeldung.

## Beispiele

Speichere die SAML-Konfiguration und teste eine signierte Assertion eines normalen Organisationskontos. Prüfe die zugeordnete E-Mail und Administratorgruppen.

## Erwartete Ergebnisse

Ohne injizierten Client liefert Anmeldung auch mit vollständigem Formular null. Erfolgsprüfungen benötigen eine Integration mit Client.

## Fehlerbehebung

Prüfe zuerst die Clientintegration. Discovery, Signaturen und Transport gehören dem injizierten Client; Rolleneinstellungen ersetzen ihn nicht.
