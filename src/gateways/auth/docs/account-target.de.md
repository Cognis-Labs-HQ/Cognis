# Kontozielrichtlinie

Auth verwaltet die Berechtigungsgrenze für privilegierte Konten bei der Kontoverwaltung und der Zwei-Faktor-Administration.

## Anwendungsbeispiele

Lösen Sie `auth:authorizeAccountTarget` in Version 1 über `system:contracts` auf. Übergeben Sie `{ actor: { sub, role }, accountId, allowSelf }` mit den Ansprüchen der injizierten Auth-Prüfung. Die Benutzerverwaltung setzt `allowSelf: false`, die Selbstverwaltung `true`.

Eine erlaubte Entscheidung lautet `{ allowed: true, accountId, isCurrent }`. Prüfen Sie das genaue Ziel und rufen Sie unmittelbar vor dessen Verwendung `isCurrent()` auf. Eine Ablehnung lautet `{ allowed: false, status, code }`. Fehlende oder inkompatible Verträge bedeuten Nichtverfügbarkeit und erlauben keine schwächere Prüfung.

Die optionale Einschränkung `allowFounder` entspricht bei Auslassung `true`. Der Wert `false` lehnt Gründerkonten unabhängig von Akteur- oder Zielrolle mit `403 protected_founder_account` ab. Ein übergebener nichtboolescher Wert ergibt `400 bad_request`. Gewöhnliche Users-Aktionen und TFA behalten ihr bisheriges Gründerverhalten; nur geschützte Deprovisionierung fordert diese zusätzliche Einschränkung an. Alternative Anbieter müssen sie als Teil dieses Vertrags in Version 1 implementieren und dürfen sie nicht stillschweigend ignorieren.

Bei `allowSelf: true` und `allowFounder: false` liest auch die Selbstverwaltung maßgebliche Metadaten und kann bei einem Gründer, fehlenden Konto oder nicht verfügbaren Metadaten scheitern. Ohne Gründerbeschränkung bleibt Selbstverwaltung ohne Metadatenabfrage erhalten.

## Technische Spezifikation

### Identität und Berechtigungen

Die verifizierten Auth-Ansprüche des Akteurs bleiben maßgeblich; die Richtlinie lädt seine Rolle weder erneut noch erhöht sie diese. Ein gewöhnliches Konto darf nur sich selbst bearbeiten, sofern Selbstverwaltung erlaubt ist. Administratoren dürfen andere Benutzer-, Lehrer- und Moderatorenkonten verwalten. Nur ein Eigentümer darf ein anderes Administrator- oder Eigentümerkonto verwalten. Ein Gründer mit gespeicherter Administrator- oder Eigentümerrolle gilt als Eigentümer; das Gründermerkmal allein erhöht keine andere Rolle. Die Benutzerverwaltung behält ihre zusätzlichen aktionsbezogenen Gründer-, Rollen- und Löschbeschränkungen.

Zielkennungen sind nichtleere, unveränderte Werte ohne Leerraum, Steuerzeichen oder Pfadtrenner. Kontenübergreifende Anfragen lesen `auth:accountStore.getInfo(accountId)` und verlangen die passende `accountId`, eine bekannte Rolle sowie einen booleschen Wert `isFounder`. Fehlende Konten ergeben `404 not_found`; ungültige Metadaten, Lesefehler oder nicht verfügbare Anbieter ergeben `503 account_policy_unavailable`. Es gibt weder eine Ersatzrolle noch zwischengespeicherte Zielberechtigungen. Ungültige Anfragen ergeben `400 bad_request`; Zugriffsablehnungen verwenden `403 forbidden`, `protected_self_account` oder `protected_admin_account`.

### Stufen und Lebensdauer

Auth registriert `auth:authorizeAccountTarget` mit den Stufen `validateRequest`, `readAccount` und `authorizeTarget` innerhalb seiner Bootstrap-Lebensdauer. Die Eingabe wird kopiert und eingefroren. Privater Vorgangszustand bindet jede Stufe an einen Aufruf; direkte Flow-Ausführung, wiederverwendete Eingaben und Änderungen öffentlicher Flow-Daten können keine Berechtigung erteilen. Erlaubte fremde Ziele werden nach den erweiterbaren Stufen erneut gelesen, damit ein verzögerter Hook keine frühere niedrigere Rolle oder ein gelöschtes Ziel beibehält.

Vertragsentfernung, fehlgeschlagener Bootstrap, Deaktivierung/Reaktivierung oder Austausch des Kontospeichers machen laufende Vorgänge und zuvor zurückgegebene Lebensdauerprüfungen ungültig. Verbraucher prüfen vor Folgeaktionen zusätzlich ihre Routenlebensdauer, den aktuellen verifizierten Akteur und die genaue Vertragsregistrierung. Unabhängige Anfragen teilen weder Metadaten-Promises noch gespeicherte Entscheidungen.

Dies ist eine zeitpunktbezogene Berechtigungsprüfung, keine Transaktion über Kontometadaten und den Speicher einer anderen Komponente. Änderungen nach dem letzten Lesen werden nicht gesperrt; `isCurrent()` prüft die Lebensdauer und liest keine Kontorollen erneut. Entscheidungen sind sofort zu verwenden und nicht für spätere Aktionen aufzubewahren.

### Vorbereitete Verwaltung und Deprovisionierung

Users kopiert und friert den verifizierten Akteur einmal ein. Die erste Ablehnung erfolgt vor der Vorbereitung von Anfragedaten oder Metadaten. Nach diesen Wartephasen und unmittelbar vor der ersten Änderung wird die Richtlinie erneut abgefragt. Nach Beginn einer erlaubten Rollenänderung schützt dieselbe Akteur- und Lebensdauerprüfung die Profilsynchronisierung; eine erneute Zielprüfung gegen die gerade gesetzte Administratorrolle würde eine zulässige Beförderung unterbrechen.

Die HTTP-Eingabe für `deprovision-user` enthält zusätzlich den eingefrorenen `actor` und die reine Funktion `isAuthorizationCurrent()`. Auth erfasst beide während `authorize-request` privat, prüft die Funktion streng und fragt in `persist-state` nach der erweiterbaren Vorbereitung erneut die Zielrichtlinie in Version 1 ab. Ein vorhandener, aber fehlender, ungültiger, werfender oder nicht exakt `true` liefernder Prüfwert führt zur Ablehnung. Spätere Änderungen an Eingaben oder Stufenergebnissen können diese Prüfung nicht entfernen. Kanonische Ablehnungen liefern `persisted: false`, `status` und `reason`; Users sendet genau eine entsprechende Antwort.

Der bestehende LDAP-Abgleich ist ein separater System-Eigentümerablauf ohne HTTP-Akteur und Prüfumschlag. Diese Auslassung ist kein Ersatzpfad für Users. Löschen und Deaktivieren beginnen mit der Kontospeicheränderung; Archivieren beginnt in `persist-state` mit dem Sitzungswiderruf. Die Bereinigung meldet dessen gespeicherte Anzahl, ohne ihn zu wiederholen. Nach Beginn einer Änderung kann die bestehende Abhängigkeitsbereinigung auch bei abgelaufener Berechtigung enden; vor einer späteren Profiländerung prüft die Route erneut Akteur und Lebensdauer. Es gibt keine speicherübergreifende Transaktion: Bereits begonnene externe Effekte können nicht abgebrochen oder zurückgerollt werden; Teilergebnisse bleiben möglich. Die geschützte Deprovisionierung übergibt `allowFounder: false`; die abschließende Richtlinie prüft das aktuelle Gründermerkmal zusammen mit der Zielrolle und erhält das bestehende Verbot für jede Gründerrolle, auch bei durch Eigentümer gestarteten Vorgängen. Nur Änderungen nach diesem letzten Lesen liegen außerhalb dieser zeitpunktbezogenen Grenze.

### Maßgebliche Deprovisionierungsergebnisse

`auth:deprovisionOutcome` in Version 1 ist ein Auth-eigener Objektvertrag mit `read(input, stageResults)` und `deletedAccount(input, stageResults)`. Die Methoden verlangen dasselbe ursprüngliche Eingabeobjekt und dieselbe Ergebnis-Map-Identität des echten Flow-Aufrufs. Kopien, vermischte Aufrufe und nicht abgeschlossene Vorgänge besitzen keinen Nachweis. Die Wiederverwendung eines Eingabeobjekts startet einen neuen Aufruf und macht den älteren Nachweis ungültig. Ergebnisse sind eingefroren; privater Eigentümerzustand bleibt maßgeblich, wenn spätere Hooks öffentliche Stufenergebnisse ersetzen oder Eingabefelder ändern.

`read` liefert das abschließende `{ persisted: true, username, action, revokedTokenCount? }` oder `{ persisted: false, status, reason }`, bei Nichtverfügbarkeit `undefined`. `deletedAccount` liefert die erfasste Kontokennung nur nach einer ausgeführten Löschung. Beide Methoden prüfen selbst Auth-Generation, Vertragsdeklaration und Anbieteridentität, auch bei behaltenen Referenzen nach Deaktivierung/Reaktivierung oder Austausch. Nachweise lesen keine Rollen erneut und machen begonnene Effekte nicht rückgängig.

Users bindet den Leser vor dem Flow, prüft Ziel und Aktion und verwendet nur den Nachweis für Antwort und spätere Profiländerung. Die Bereinigung von Auth-Kontoinstanzen, Calendar, Keyring, Profile, Classes, Messages und Internal Notification löst `deletedAccount` über `ctx` auf; öffentliche `persist-state`-Werte und veränderliche Eingabefelder erlauben keine Löschung. Fehlende, inkompatible oder fehlerhafte Anbieter führen zur Ablehnung. Auth und aktualisierte Verbraucher sind gemeinsam bereitzustellen; alternative Anbieter müssen diesen aufrufgebundenen Vertrag implementieren. Alte Verbraucher, die nur öffentliche Ergebnisse lesen, unterstützen diesen Schutz nicht. Bereinigungsreihenfolge und Grenzen bei bereits begonnenen Effekten bleiben erhalten.

Bekannte Companion-Grenze: [Jitsi in Revision 2dfe50b](https://github.com/Cognis-Labs-HQ/cognis-module-jitsi-meet/blob/2dfe50bfd46f32e08291a2aacbdeb27d559fb2f8/api/index.js#L380-L451) verwendet weiterhin öffentliche Persistenz- und Eingabefelder für die Bereinigung von Meetings und zugehörigen Ressourcen. Diese Revision muss auf `auth:deprovisionOutcome` umgestellt oder deaktiviert werden, bevor die Bereitstellung als geschützt gilt; die gebündelte Änderung sichert keinen alten externen Hook. Schreibgeschützte Quellprüfungen von Produktions-API und Bootstrap fanden keinen entsprechenden Verbraucher in Whiteboard `ef9e9b4` oder Terms `330bf49`. Dies sind Quellprüfungen, keine ausgeführten Kompatibilitätstests.

Auth benötigt die flach unveränderlichen Flow-Kontexte von Core 0.6.6. Stellen Sie diese Core-Version vor oder zusammen mit Auth und den Nachweisverbrauchern bereit. Zur Laufzeit wird der tatsächlich eingefrorene Kontext geprüft, kein Versionsname: Ein alter, veränderlicher Runner ist vor Zielmetadatenzugriffen oder Deprovisionierungseffekten nicht verfügbar; seine Erkennung macht ältere Entscheidungen und Nachweise ungültig. Getestete maximale Abhängigkeitsbereiche allein stellen diese Mindestgarantie nicht her. Nur Kontextreferenzen sind unveränderlich; verschachtelte Eingaben, Daten und Ergebnisinhalte bleiben veränderlich, daher sind authentifizierte Eigentümernachweise weiterhin erforderlich. Erweiterungen dürfen keine obersten Kontextreferenzen ersetzen; gemeinsamer Zustand gehört in veränderliche Datenfelder.

### Integration

Stellen Sie Auth 2.2.12 zusammen mit TFA 1.3.13 und API 0.13.36 bereit. Ältere oder alternative Auth-Implementierungen müssen den ausführbaren, versionierten Vertrag bereitstellen, bevor kontenübergreifende Verwaltung verfügbar ist. Es gibt keinen Ersatz durch direkte Kontospeicherabfragen oder eine Mindestrolle des Aufrufers. Eigene TFA-Einrichtung, Methodendetails und ausstehende Anmeldungen erhalten durch Abfrageparameter kein fremdes Kontoziel.
