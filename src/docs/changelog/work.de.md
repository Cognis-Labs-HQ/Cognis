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
