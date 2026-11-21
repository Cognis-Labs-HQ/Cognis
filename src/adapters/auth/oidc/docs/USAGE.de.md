# Anwendung

Praktische Abläufe für OpenID Connect.

## Voraussetzungen

Der mitgelieferte OIDC-Adapter besitzt keinen eingerichteten Protokollclient. createAdapter() liefert einen leeren Client; die Integration muss über setClient() einen geprüften Client bereitstellen. Konfiguration allein ermöglicht keine Anmeldung.

## Beispiele

Beschaffe einen gültigen Zugriffstoken über deine Clientanwendung und übermittle ihn mit dem eingerichteten Cognis-Anbieter. Teste zunächst eine Identität ohne Administratorrechte.

## Erwartete Ergebnisse

Ohne injizierten Client liefert Anmeldung auch mit vollständigem Formular null. Erfolgsprüfungen benötigen eine Integration mit Client.

## Fehlerbehebung

Prüfe zuerst die Clientintegration. Discovery, Signaturen und Transport gehören dem injizierten Client; Rolleneinstellungen ersetzen ihn nicht.
