# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von LDAP-Anmeldung.

## Schnittstellen

`LdapClient.authenticate(username, password, options)` liefert `LdapIdentity | null`. Der Adapter liest Benutzername, Passwort und optional authSourceId, wählt einen benannten Server und liefert provider, externalUserId, email, displayName und role. Standard ist StandardLdapClient.

## Konfiguration

Administration speichert `unify` und benannte `servers`. Bereite Server brauchen identifier, serverUrl, baseDn, bindDn, bindPassword, userAttribute und userFilter. userDn/groupDn, groupFilter, memberOf und nestedMemberOf steuern Suche; roleMappings ordnet Gruppen Rollen zu. Passwortänderungen brauchen writebackEnabled und Suchbereich. Vereinheitlichte Quellen versuchen bei Verbindungsfehlern weitere Server.

## Verhalten

### Verbindungstests

Der Adapter-Testendpunkt prüft die Bindung des konfigurierten Dienstkontos vor der Verzeichnissuche. Ungültige LDAP-Zugangsdaten werden als Ablehnung von Bind-DN oder Passwort gemeldet; Transport- und Zertifikatsfehler erhalten getrennte sichere Diagnosen. Genaue Anbieterfehler werden nur im Serverprotokoll erfasst.

Ein gespeicherter LDAP-Adapter kann aktiviert werden, wenn jeder benannte Server über Server-URL, Basis-DN, Bind-DN, Bind-Passwort, Benutzernamenattribut und Benutzerfilter verfügt. Der Adapter bewertet die Bereitschaft selbst, damit verschachtelte Mehrserverkonfigurationen und ausgeblendete Passwörter korrekt behandelt werden.

Der Aktivierungsregler in der Administration bleibt deaktiviert, bis mindestens ein LDAP-Server konfiguriert wurde.

Nach Abschluss der Benutzerverifizierung wird der Server zur ausstehenden Konfiguration hinzugefügt und die Aktivierung sofort freigeschaltet. Eine anschließende Aktivierung speichert zuerst die ausstehende Serverliste und aktiviert danach den Adapter. Beim Schließen der Einrichtung nach Beginn einer noch nicht gespeicherten Serverkonfiguration muss das Verwerfen bestätigt werden.

Wird vor dem manuellen Test der Benutzerauthentifizierung „Einstellungen speichern“ gewählt, auch mit der Eingabetaste, wird derselbe Authentifizierungstest automatisch ausgeführt. Schlägt die Authentifizierung fehl, kehrt die Einrichtung zum Verbindungsschritt zurück, damit die Bindungsfelder korrigiert werden können.

Beim Löschen des letzten konfigurierten Servers wird eine Warnung zur Bestätigung angezeigt und der LDAP-Adapter nach der Bestätigung deaktiviert. Verbindungstests liefern feldbezogene Diagnosen für jede anhand der LDAP-Antwort erkannte mögliche Ursache. Das Einrichtungsformular hebt alle gemeldeten Felder hervor, statt einen Fehler mit mehreren Feldern, wie abgelehnte Bindungszugangsdaten, auf eine Eingabe zu reduzieren.

Die Einrichtungserweiterung bezieht ihre sichtbaren Texte aus den Sprachressourcen des Adapters. Eine erfolgreiche Benutzerauthentifizierung sowie das Erstellen oder Aktualisieren eines Servers werden mit Erfolgsmeldungen bestätigt.

Der Adapter deklariert `/static/adapters/auth/ldap/languages` als Basis seiner Sprachressourcen. Die Administration erhält diese URL in den Adaptermetadaten und erweitert ihre i18n-Instanz vor dem Import des Einrichtungsdialogs.

LDAP-Verbindungs- und Zugangsdatenformulare übergeben die Lokalisierungsschlüssel des Adapters direkt an den gemeinsamen Formularkompositor. Bei einem Authentifizierungsversuch ohne beide erforderlichen Zugangsdaten wird eine lokalisierte Fehlermeldung angezeigt und das erste ungültige Feld fokussiert.

Das Entfernen einer Quelle führt den Ablauf `reconcile-auth-sources` aus. Er widerruft die Sitzungen aller mit der entfernten Quelle verbundenen Konten. Ohne Quellenvereinheitlichung wird das Nutzerkonto entfernt; mit Vereinheitlichung wird nur die entfernte Quellenidentität gelöst, sodass eine andere konfigurierte Quelle das erhaltene Konto authentifizieren und aktualisieren kann.

Nach erfolgreichem „Testen und ermitteln“ wird eine lokalisierte Erfolgsmeldung angezeigt, bevor die Einrichtung zu Filtern und Rollenzuordnungen wechselt.

### Typverträge

Die Adapter-Fabrik erhält die adaptereigene Methode zur Client-Injektion und den Ergebnistyp für Verzeichnis- oder Zugangsdatenprüfungen. Verbraucher grenzen den Ergebnistyp ein, bevor sie Verzeichnisgruppen oder Zugangsdaten lesen. Verzeichnissuchen verwenden ldapts mit einer Seitengröße von 100; Authentifizierung und Gruppenzuordnung bleiben unverändert.

## Sicherheit

Verzeichniszugangsdaten prüft der konfigurierte LDAP-Client. Administratorzugriff folgt Gruppenzuordnungen; schütze Bind-Daten und prüfe das TLS-Zertifikat.

## Referenz

- [src/adapters/auth/ldap/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/manifest.json)
- [src/adapters/auth/ldap/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/package.json)
- [src/adapters/auth/ldap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/auth/ldap/index.ts)
