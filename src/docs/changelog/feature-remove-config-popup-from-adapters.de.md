# Klarere Adaptersteuerung

**Feature-Zweig:** feature-remove-config-popup-from-adapters

## Leere Einstellungsfenster entfernt

Adapterzeilen öffnen kein Einstellungsfenster mehr, wenn außer dem Betriebsstatus keine Felder konfiguriert werden können. Ein Klick auf diese Zeilen klappt ihre Manifestdetails auf; der vorhandene Ein-/Ausschalter aktiviert oder deaktiviert den Adapter.

## LDAP-Ein-/Ausschalter

Das Einstellungsfenster der LDAP-Authentifizierung enthält jetzt einen Ein-/Ausschalter, sodass Administratoren den Adapter direkt in seiner Konfiguration aktivieren oder deaktivieren können.

## Komponentensteuerungen bleiben synchron

Die Administration bezeichnet aktive Komponenten jetzt einheitlich als Aktiviert, deaktiviert gesperrte Konfigurationsschalter, aktualisiert Komponentenstatus und Navigation nach Zustandsänderungen, zeigt Manifestdetails für Adapter ohne Einstellungen und erlaubt das Deaktivieren von Share-Methoden. Die Authenticator-App verwendet standardmäßig SHA-256. Adapter-Einstellungstitel wiederholen keine Manifestversionen mehr.

## Dauerhafter Status von Share-Adaptern

Deaktivierte Share-Adapter bleiben nun auch nach einem Serverneustart deaktiviert. Bereits ausgestellte Freigaben werden nicht mehr aufgelöst, solange ihr Adapter deaktiviert ist.

## Änderungen

- [bde0ea7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bde0ea7a65b26aa85e467dc7954e6db3c652e701)
