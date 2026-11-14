# Registrierungsverträge

Das Registrierungs-Gateway verwaltet öffentliche Anmeldung und Einladungseinlösung und stellt Provider-Operationen über Gateway-Fähigkeiten und Routen bereit.

## Verwendungsbeispiele

Für die öffentliche Anmeldung wird die registrierte Fähigkeit aufgelöst. Das Ergebnis enthält username, enabled und die Rolle des Providers:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Technische Spezifikation

Einladungen werden über POST /api/v1/registration/redeem mit einem JSON-Objekt eingelöst, das token, username, password und optional email und displayName enthält. Das Gateway reicht die vollständigen Eingaben an den Einladungsprovider weiter. Dieser ist für Token-Validierung, Kontoerstellung und Speicherung der Einlösung verantwortlich; Fehler werden an die Fehlerbehandlung der Route weitergegeben. Die öffentliche Registrierung verwendet registration:public:isEnabled für die Verfügbarkeit und registration:public:register für die Ausführung. Deaktivierte Gateways weisen die Ausführung mit gateway_disabled zurück; ein nicht verfügbarer öffentlicher Provider mit public_disabled. Die Verfügbarkeit wird bei der Ausführung geprüft. Bootstrap registriert diese Fähigkeiten und erweitert vorhandene Abläufe gateAccountCreation und constructRegistrationUi über ctx. Aufrufer nutzen diese Schnittstellen, statt konkrete Adapter zu importieren.

## Begrenzter Abschluss

verifyToken enthält ausschließlich Onboarding-Berechtigung; onboardingOperations listet registrierte IDs. Der Browser hält den Nachweis im Registrierungsablauf und widerruft ihn vor der Rückkehr zur Anmeldung. Doppelte Übermittlungen teilen den laufenden Versuch. Nach dem Verlassen eintreffende Antworten werden ohne Erweiterungen oder Navigation bereinigt. Fehlgeschlagener Widerruf wird nicht als Erfolg dargestellt. Bei erstelltem Konto und fehlgeschlagener Nachweisausstellung ermöglicht accountCreated die Wiederherstellung über die Anmeldung; Einlösung und Speicherung sind nicht atomar.

Erweiterungen deklarieren onboardingOperations und implementieren completeRegistration({values, i18n, descriptor, executeOnboarding}). executeOnboarding(operation, input) liefert gelesene Ergebnisdaten und lehnt nicht deklarierte Operationen ab. Jede Operation benötigt zusätzlich einen aktuellen Serverhandler über auth:onboarding. Beliebiges authentifiziertes apiFetch wird nicht bereitgestellt. Tatsächliche Benutzerauswahl, Validierung und Versionsprüfung bleiben erforderlich; Registrierung ist keine Zustimmung.

Dies ist eine inkompatible Vertragsänderung. Terms of Service 1.6.13 verwendet begrenzte Zustimmungsoperationen und constructRegistrationUi. Passende Cognis- und Modulversionen gemeinsam bereitstellen; Registrierung während gemischter Versionen gesperrt lassen. Weitere Abschlussanbieter müssen ebenfalls umgestellt werden. Es gibt keinen Rückfall auf umfassende Tokens.

Die Registrierungsseite bleibt außerhalb der angemeldeten Tutorials. Einladungs- und Richtlinienführungen behalten ihre Steuerelemente und Ziele. E-Mail-Prüfung und Zustimmung erfolgen vor der Anmeldung; Registrierung beendet keine TFA-Einrichtung.

Alle Operationsdeklarationen werden vor dem Import oder Aufruf einer Erweiterung kopiert und eingefroren. Ein Anbieter mit deklarierten Onboarding-Operationen muss einen aufrufbaren Abschlusshandler laden, bevor ein Konto erstellt werden darf. Feldfabriken und andere Erweiterungen können die erfassten Berechtigungen nicht erweitern.

Schlägt die Zusammenstellung der Registrierungskonfiguration fehl, wird registration_configuration_unavailable statt einer leeren Integrationsliste zurückgegeben. Nicht migrierte Abschlussexporte ohne deklarierte Operationen blockieren ebenfalls die Registrierung. Optionale Erweiterungen, die nur Felder bereitstellen, werden weiterhin unabhängig geladen.

## Passwortformular-Texte

Registration 1.2.9 verwendet die Host-Schlüssel `ui.reuse.password_requirements` und `ui.reuse.passwords_match` gemeinsam mit Sicherheit. Stellen Sie die passenden Host-UI-Kataloge bereit und aktualisieren Sie Integrationen, die diese Texte verwenden, auf die gemeinsamen Schlüssel. Fehlende Werte der bevorzugten Sprache werden aus denselben englischen XML-Schlüsseln aufgelöst; fehlende oder leere englische Werte führen ausdrücklich zu einem Fehler. Die öffentliche Registrierung bleibt außerhalb angemeldeter Anleitungen; Einladungs- und Richtlinienanleitungen behalten ihre Bedienelemente.
