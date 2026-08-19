# Seiten installierter Module wiederherstellen

## UI-Routen externer Module aus ihrem Installationsverzeichnis laden

Installierte Module werden jetzt anhand ihrer stabilen UUID im Verzeichnis für externe Module aufgelöst. Ihre deklarierten Seiten und Navigationseinträge werden beim Start automatisch geladen, anstatt im Pfad der mitgelieferten Module gesucht zu werden.

## Modulstart vor Anfragen abschließen

Cognis wartet jetzt, bis gespeicherte Modulzustände wiederhergestellt und Module vollständig gestartet wurden, bevor eine Anfrage verarbeitet wird. Skripte und Styles externer Module sind dadurch registriert, bevor ihre Seiten sie anfordern.

## Authentifizierungsfunktionen bereitstellen

Das Authentifizierungs-Gateway veröffentlicht jetzt seine Funktionen zur Anfrageauthentifizierung und Rollenprüfung über den Capability-Bus. Externe Module können geschützte API-Routen ohne Importe aus Gateway-Interna starten, sodass ihre UI-Ressourcen und Navigationseinträge aktiv bleiben.

## Nur deklarierte UI-Funktionen laden

Module können `requiresCapabilities` in ihrem Manifest deklarieren. Vor dem Einhängen einer Modulroute importiert Cognis ausschließlich die registrierten Anbieter-Skripte für die deklarierten `ui:*`-Funktionen. Benötigte UI-Dienste sind damit verfügbar, ohne unbeteiligte Integrationen freizugeben.

## Capabilities prüfen und dokumentieren

Owner können alle registrierten Capability-IDs über `GET /api/v1/system/capabilities` oder `cognisctl system:capabilities` auflisten. Die Dokumentation für Module, Authentifizierungs-Gateway und Profil-Adapter beschreibt nun Anforderungsdeklarationen und die bereitgestellten Capabilities.

## Richtung der Version anzeigen

Karten und Detailansichten installierter Module zeigen eine abweichende Version des ausgewählten Kanals jetzt unterhalb der aktuellen Version. Upgrades verwenden einen Aufwärtspfeil, während ein ungewöhnliches Downgrade mit Abwärtspfeil in einer hellorangenen Plakette erscheint.

## Moduldetails stabil halten

Beim Öffnen oder Aktualisieren einer Moduldetailansicht bleibt die Seitenposition jetzt erhalten. Jede angezeigte Version trägt das Präfix `v`, und die Aktualisierung eines aktiven Moduls führt Deaktivieren, Installieren und erneutes Aktivieren in einer Aktion aus.

## Steuerelemente stabil halten

Moduldetailseiten verwenden jetzt Router-gestützte UUID-Deep-Links und bleiben dabei im Page Composer. Aktualisierungen des Lebenszyklus halten die sichtbare Zusammenstellung der Schaltflächen stabil, auch während ein aktives Modul für ein Upgrade vorübergehend deaktiviert wird.

## Direkte Modulseiten einmal starten

Direkte Aufrufe externer Modul-SPA-Routen verwenden jetzt einen Core-Einstiegspunkt, der deklarierte Capability-Anbieter vor der Modulroute importiert. Anbieter- und Routen-URLs verwenden dieselbe Asset-Version wie die Router-Navigation, wodurch zeitweise fehlende Capabilities und doppelte Navbar-Beiträge verhindert werden.

## Mitgelieferte Module auslagern

Analytics und Nextcloud Whiteboard sind jetzt eigenständige externe Modul-Repositories mit eigener Repository-Metadaten, Lizenzen, READMEs, vollständigen Integritätslisten, übersetzten Bereitstellungshinweisen, UUID-Abhängigkeiten und expliziten Capability-Anforderungen.

## Durchsuchen von Modul-Screenshots verbessern

Screenshots in der Moduldetailansicht bleiben nun in einem begrenzten Karussell mit Zurück- und Weiter-Steuerung, verblassten benachbarten Vorschauen, animierten Übergängen und automatischer Rotation. Manifeste mit dem optionalen Feld `template: true` werden aus Marktplatzergebnissen und direkten Detailansichten ausgeschlossen.

## Eindeutige Marktplatzmodule erzwingen

Analytics und Nextcloud Whiteboard befinden sich nun in eigenen Repositorys und werden nicht mehr mitgeliefert. Die Marktplatzsuche akzeptiert jetzt das erste Repository für jede Modul-UUID, protokolliert und verwirft spätere Duplikate und aktualisiert Darstellungsmetadaten aus dem akzeptierten Repository, während der installierte Lebenszyklusstatus erhalten bleibt.

## Infrastrukturverzeichnisse der Gateways ignorieren

Die automatische Gateway-Erkennung startet jetzt nur Verzeichnisse mit einem Gateway-Manifest. Dadurch wird das Infrastrukturverzeichnis `gateways/reuse` in Produktions-Builds nicht mehr als Gateway importiert.

## Rückmeldungen zum Modul-Lebenszyklus verdeutlichen

Das Deaktivieren von Modulen wird nun als Warnung protokolliert und das Löschen externer Module ausdrücklich erfasst. Marktplatz-Aktualisierungen zeigen pro Klick genau eine Abschlussmeldung, während Module sichtbar bleiben, sofern ihr Manifest `template` nicht ausdrücklich auf `true` setzt.

## Cognis-HQ-Module empfehlen

Die integrierte Empfehlungsliste enthält jetzt die veröffentlichten Modul-UUIDs für Jitsi Meet, Nextcloud Whiteboard und Analytics aus der Organisation Cognis Labs HQ.

## Protokollierung des Modul-Lebenszyklus erweitern

Hinzufügen, Aktualisieren, Löschen und Scannen von Modulquellen sowie die Anzahl der Scanergebnisse werden jetzt mit passender Priorität protokolliert; Validierungs- und Aktivierungsfehler erscheinen als Fehler. Die Marktplatz-Bildsuche verwendet außerdem ein passendes PNG oder ein anderes unterstütztes Bild, wenn das Manifest eine fehlende Dateiendung nennt. Dadurch werden die Jitsi-Meet-Grafiken wieder angezeigt, solange dessen Manifest noch auf nicht vorhandene SVG-Dateien verweist.

## Aufblitzen von Modulbildern verhindern

Modulkarten und Detailmedien bleiben nun verborgen, bis jedes aktualisierte Bild gültige Abmessungen meldet. Feste Symbolabmessungen reservieren außerdem den Platz in der Karte vor dem Laden, sodass rohe oder übergroße Modulgrafiken bei Marktplatz-Aktualisierungen nicht mehr kurz aufblitzen.

## Module bei uneindeutigen Scans behalten

Marktplatz-Scans werten eine leere Repository-Antwort, ein vorübergehend fehlendes Manifest, eine vorübergehend ungültige Antwort oder einen fehlgeschlagenen Quellenabruf nicht mehr als Beweis für die Löschung eines zuvor gefundenen Moduls. Zwischengespeicherte Einträge bleiben bis zum ausdrücklichen Entfernen ihrer Quelle sichtbar; Warnprotokolle nennen fehlgeschlagene Scans und die Anzahl beibehaltener Module.

## Sicherere, effiziente Modulsuche

Marketplace-Aktualisierungen wurden in einem authentifizierten Scan gebündelt, Benutzer-Token für GitHub an der vertrauenswürdigen Quelle ergänzt, Abhängigkeits- und Bestätigungsprüfungen vor der Ausführung externen Codes wiederhergestellt und Manifestanfragen für GitHub Enterprise auf die konfigurierte API umgestellt.

## Direktes Modulladen abschließen

Beim direkten Laden der Modulseite wird die erfasste Ladeaufgabe nach Abschluss oder Fehlschlagen des Seitenaufbaus immer beendet. Dadurch bleibt das Ladesymbol nach einer Browser-Aktualisierung nicht mehr sichtbar.

## Scans speichern und begrenzen

Nach Serverneustarts werden Module zuerst aus dem gespeicherten Marketplace-Katalog geladen. Automatische Scans beim Seitenladen und Serverstart verbrauchen keine Anbieter-Kontingente mehr. Scanversuche werden mit einem einstündigen Intervall gespeichert, sodass wiederholte Aktualisierungen den Katalog auf dem Datenträger verwenden.

## Autorität des Quellcaches

Die integrierte Quelle Cognis Labs HQ akzeptiert nun PAT-Aktualisierungen, während ihre Identitätsfelder gesperrt bleiben. Doppelte Modul-UUIDs werden zugunsten der Cognis-Quelle aufgelöst. Kataloge, Scan-Metadaten und Assets liegen im konfigurierten Modulverzeichnis unter .cache.

## GitHub-Zugang sofort nutzen

Konfigurierte PAT-Felder zeigen einen maskierten Wert, ohne das Geheimnis offenzulegen. Beim Speichern neuer Zugangsdaten wird die Scan-Sperrzeit dieser Quelle gelöscht, sodass die nächste Marketplace-Anfrage sofort die neue GitHub-Autorisierung verwendet.

## Anbieter-Token prüfen

Neue Marketplace-PATs werden vor dem Speichern gegen den konfigurierten Anbieter-Namensraum geprüft. Ungültige, nicht autorisierte, nicht prüfbare oder unzureichend berechtigte Zugangsdaten zeigen eine lokalisierte Warnung und lassen den Quelleneditor zur Korrektur geöffnet.

## PAT-Konfiguration behalten

Marketplace-Zugangsdatenkennungen werden nun zusätzlich im Cache des Modulverzeichnisses gespeichert. Die integrierte Cognis-Quelle stellt ihre konfigurierte PAT-Markierung nach einem Server- oder Containerneustart wieder her, ohne das PAT außerhalb des Benutzer-Schlüsselbunds zu speichern.

## PAT-Berechtigungen angeben

Hinweise zu Zugangsdaten sind in der Oberfläche nun kurz. Serverprotokolle nennen das genaue Problem sowie die erforderlichen fein abgestuften GitHub-Berechtigungen (Repository-Zugriff, Metadaten lesen, Inhalte lesen), den klassischen Bereich repo für private Repositorys, die Organisations-SSO-Freigabe und offizielle Dokumentationsverweise.

## Release-Wechsel stabilisieren

Installationen durch Release-Kanalwechsel, Upgrades und Downgrades speichern nun den gewählten Branch, Commit und die Version vor dem Neustart. Neustarthinweise erscheinen nur für zuvor aktivierte Module, betroffene Module lehnen bis zum Neustart weitere Lebenszyklusaktionen ab und unveränderte oder abgebrochene Kanalwechsel kollidieren nicht mit späteren Aktionen.

## Moduldetails stabil halten

Aktionen in Moduldetails verwenden nun das schwebende Composer-Menü, während Status- und Kategorienavigation die ausgewogene, scrollbare Seitenleiste nutzt. Die Detailauswahl bleibt bei Aktualisierungen, Lebenszyklusereignissen und Hinweisen erhalten; nur eine ausdrückliche Navigation verlässt die Detailansicht.

## Modulaktionen ausrichten

Schwebende Modulaktionen haben nun eine einheitliche Höhe und vertikale Ausrichtung, einschließlich der Zurück-Steuerung. Das erweiterte Hamburger-Menü bleibt im Detailkopf, damit sein Popup zuverlässig verankert ist. Leichte Aktionsaktualisierungen vermeiden das Neuzeichnen der gesamten Modulkarte bei nicht zugehörigen Klicks.

## Modulaktionen eindeutig zuordnen

Aktionen auf Modulkarten werden jetzt in lesbare Rasterspalten umgebrochen, damit Installiert, Upgrade oder Downgrade, Aktivieren und Deinstallieren eindeutig getrennten Steuerelementen zugeordnet bleiben. Beim Aktivieren eines Moduls werden deaktivierte Gateway-Abhängigkeiten aktiviert und gespeichert; tatsächlich fehlende Abhängigkeiten liefern statt eines allgemeinen 400-Fehlers eine konkrete, umsetzbare Antwort.

## Versionen der Veröffentlichungskanäle aktualisieren

Eine ausdrückliche Katalogaktualisierung umgeht jetzt die normale Wartezeit für Anbieter-Scans und liest jedes Branch-Manifest erneut. Wenn ein ausgewählter Branch die installierte Version erreicht, entfernt Cognis die veraltete Herabstufungsaktion sofort. Tatsächliche Herabstufungen installieren nun den ausgewählten Branch und werden mit Wird herabgestuft und Modul herabgestuft klar von Upgrades unterschieden.

## Ausgewählte Downgrade-Revision installieren

Herabstufungen installieren jetzt genau den vom aktualisierten Katalog angegebenen Commit, selbst wenn der Branch vor Installationsbeginn fortschreitet. Die Herabstufungsanzeige besitzt ein eigenes dunkles Design, und Moduldetail-Kopfzeilen erhalten einen undurchsichtigen Hintergrund, damit Bannerbilder nicht durch die fixierte Anwendungskopfzeile scheinen.
