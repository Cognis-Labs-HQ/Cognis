# LDAP-Authentifizierungsadapter

## Überblick

Der LDAP-Adapter authentifiziert Benutzer gegen einen LDAP-Verzeichnisserver und ist die richtige Wahl für Organisationen, die Identitäten bereits in Active Directory, OpenLDAP oder einem ähnlichen Verzeichnisdienst verwalten. Benutzer melden sich mit einem LDAP-Access-Token an; der Adapter bindet sich an das Verzeichnis mit einem Service-Account, sucht den Benutzer und ordnet die Gruppenmitgliedschaft der Cognis-Admin-Rolle zu.

## Verantwortlichkeiten

- Ein `accessToken`-Credential akzeptieren und es gegen den LDAP-Server authentifizieren.
- Die LDAP-Gruppen des authentifizierten Benutzers dem Cognis `isAdmin`-Flag zuordnen.
- Die `AuthProviderAdapter`-Schnittstelle für das Auth-Gateway bereitstellen.
- `getConfigSchema()` mit der Beschreibung aller konfigurierbaren Felder bereitstellen.

## Architektur

`LdapAuthAdapter` in `src/adapters/auth/ldap/index.ts` implementiert `AuthProviderAdapter`.

```ts
export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}

export interface LdapIdentity {
    id: string;
    email?: string;
    groups?: string[];
}
```

## Konfiguration

Konfiguration über `PUT /api/v1/gateways/auth/adapters/ldap/config` (nur Admin).

| Schlüssel      | Beschreibung                                                       | Erforderlich |
| -------------- | ------------------------------------------------------------------ | ------------ |
| `host`         | LDAP-Server-Hostname                                               | Ja           |
| `port`         | LDAP-Server-Port                                                   | Ja           |
| `bindDn`       | Bind-DN für den Service-Account                                    | Ja           |
| `bindPassword` | Passwort für den Bind-DN                                           | Ja           |
| `baseDn`       | Basis-DN für Benutzersuchen                                        | Ja           |
| `adminGroups`  | Kommagetrennte LDAP-Gruppen, deren Mitglieder Admin-Rolle erhalten | Nein         |

## Verbindungstests

Der Adapter-Testendpunkt prüft die Bindung des konfigurierten Dienstkontos vor der Verzeichnissuche. Ungültige LDAP-Zugangsdaten werden als Ablehnung von Bind-DN oder Passwort gemeldet; Transport- und Zertifikatsfehler erhalten getrennte sichere Diagnosen. Genaue Anbieterfehler werden nur im Serverprotokoll erfasst.

Ein gespeicherter LDAP-Adapter kann aktiviert werden, wenn jeder benannte Server über Server-URL, Basis-DN, Bind-DN, Bind-Passwort, Benutzernamenattribut und Benutzerfilter verfügt. Der Adapter bewertet die Bereitschaft selbst, damit verschachtelte Mehrserverkonfigurationen und ausgeblendete Passwörter korrekt behandelt werden.

Der Aktivierungsregler in der Administration bleibt deaktiviert, bis mindestens ein LDAP-Server konfiguriert wurde.

Nach Abschluss der Benutzerverifizierung wird der Server zur ausstehenden Konfiguration hinzugefügt und die Aktivierung sofort freigeschaltet. Eine anschließende Aktivierung speichert zuerst die ausstehende Serverliste und aktiviert danach den Adapter. Beim Schließen der Einrichtung nach Beginn einer noch nicht gespeicherten Serverkonfiguration muss das Verwerfen bestätigt werden.

Wird vor dem manuellen Test der Benutzerauthentifizierung „Einstellungen speichern“ gewählt, auch mit der Eingabetaste, wird derselbe Authentifizierungstest automatisch ausgeführt. Schlägt die Authentifizierung fehl, kehrt die Einrichtung zum Verbindungsschritt zurück, damit die Bindungsfelder korrigiert werden können.

Beim Löschen des letzten konfigurierten Servers wird eine Warnung zur Bestätigung angezeigt und der LDAP-Adapter nach der Bestätigung deaktiviert. Verbindungstests liefern feldbezogene Diagnosen für jede anhand der LDAP-Antwort erkannte mögliche Ursache. Das Einrichtungsformular hebt alle gemeldeten Felder hervor, statt einen Fehler mit mehreren Feldern, wie abgelehnte Bindungszugangsdaten, auf eine Eingabe zu reduzieren.

Die Einrichtungserweiterung bezieht ihre sichtbaren Texte aus den Sprachressourcen des Adapters. Eine erfolgreiche Benutzerauthentifizierung sowie das Erstellen oder Aktualisieren eines Servers werden mit Erfolgsmeldungen bestätigt.

Der Adapter deklariert `/static/adapters/auth/ldap/languages` als Basis seiner Sprachressourcen. Die Administration erhält diese URL in den Adaptermetadaten und erweitert ihre i18n-Instanz vor dem Import des Einrichtungsdialogs.

LDAP-Verbindungs- und Zugangsdatenformulare übergeben die Lokalisierungsschlüssel des Adapters direkt an den gemeinsamen Formularkompositor. Bei einem Authentifizierungsversuch ohne beide erforderlichen Zugangsdaten wird eine lokalisierte Fehlermeldung angezeigt und das erste ungültige Feld fokussiert.
