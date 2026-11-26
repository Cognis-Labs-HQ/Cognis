# UI-Wiederverwendung erzwingen

**Feature-Zweig:** feature-add-tests-for-ui-page-publication-validation

## Seitenaufbau absichern

Automatisierte Architekturprüfungen weisen nun Seiten des Kerns und installierter externer Module zurück, die eine Einbindungsfunktion ohne den Cognis-Seitenkomponisten veröffentlichen.

## Wiederverwendbare Werkzeuge absichern

Externe Browsermodule dürfen keine Funktion mehr erneut deklarieren, die bereits über die Cognis-Oberfläche zur Wiederverwendung angeboten wird. Direkte Ausgaben in das Einbindungswurzelelement werden gemeinsam mit der fehlenden Komponistennutzung gemeldet.

## Formularaufbau absichern

Browsercode des Kerns und externer Module muss den Cognis-Formularersteller verwenden, sobald er ein Formular veröffentlicht oder eine Übermittlung verarbeitet. Der Ersteller unterstützt nun vertrauenswürdige komplexe Inhalte und validierte Formularattribute, damit individuelle Formulare die gemeinsame Umhüllung beibehalten.

## Anonyme Modulseiten veröffentlichen

Aktivierte Module können nun ausdrücklich eine öffentliche SPA-Route für Inhalte wie Nutzungsbedingungen registrieren. Anonyme Clients erhalten nur öffentliche Routenbeschreibungen, während authentifizierte Routen geschützt bleiben und öffentliche Routen den anonymen Zugriff nicht mit Rollenbeschränkungen kombinieren können.

## Vollständige Testabdeckung wiederherstellen

Der Formularersteller für die Passwortbestätigung wird nun durch seine Browserintegration injiziert, damit Node-basierte Gateway-Tests die anbieterneutrale Schutzlogik ausführen können. Die Abdeckung des Anmeldelayouts prüft jetzt die Platzierung des zusammengesetzten Formulars statt der Reihenfolge von Quelldeklarationen.

## Dokumentlinks zur Authentifizierung hinzufügen

Anmeldung und Registrierung zeigen nun einen gemeinsamen Linkstreifen am unteren Rand. Aktivierte Module registrieren einen Browserbeitrag für den Authentifizierungsfußbereich über `ctx`; Beiträge veröffentlichen Dokumentlinks über die bestehende neutrale Fußbereich-Link-Fähigkeit. Die Veröffentlichungsprüfung weist nun auskommentierte Komponisten-Platzhalter, direkte Schreibzugriffe auf das Einbindungswurzelelement auch neben einem Komponisten sowie externe Umgehungen für API-Anfragen, Zeitstempel, Rückmeldedialoge und Skriptladen zurück.

## Abhängigkeiten beim Aktivieren anzeigen

Marketplace-Karten kennzeichnen ein Modul nicht mehr nur deshalb, weil ein anderes installiertes oder verfügbares Modul es als Abhängigkeit deklariert. Erforderliche und optionale Abhängigkeiten werden nur beim Aktivieren des anfordernden Moduls angezeigt, wenn die Beziehung handlungsrelevant ist.

## Anonymen Zugriff auf Rechtsdokumente vervollständigen

Der Authentifizierungsfußbereich wird nun innerhalb der sichtbaren Anmelde- und Registrierungsbereiche angezeigt, sodass registrierte Beiträge ihre Rechtsdokumentlinks darstellen können. Direkte Aufrufe serverseitig genehmigter öffentlicher SPA-Routen umgehen den authentifizierten `load-page`-Flow. Dadurch verwandelt `/terms-of-service` eine fehlende Sitzung nicht mehr in eine Weiterleitung zur Anmeldung wegen einer abgelaufenen Sitzung.

## Authentifizierungslinks veröffentlichungsbewusst halten

Beiträge für den Authentifizierungsfußbereich geben ihre derzeit zulässigen Links nun über `listAuthFooterLinks()` zurück, statt beim Import einen festen Satz einzutragen. Cognis prüft und ersetzt den Linksatz jedes Anbieters atomar, sodass unveröffentlichte oder zurückgezogene Dokumente nicht auf Anmelde- und Registrierungsseiten verbleiben.

## Öffentliche Rechtsseiten verwenden die Cognis-Oberfläche

Die integrierte Lizenzseite ist nun ausdrücklich öffentlich, während Änderungsprotokolle nur innerhalb der authentifizierten Anwendung verfügbar bleiben und in Authentifizierungsfußbereichen ausgeblendet werden. Der Page Composer vereinheitlicht öffentliche Modulseiten so, dass die anonyme Cognis-Oberfläche erhalten bleibt, statt das Dokument ohne Rahmen darzustellen.

## Von Modulen veröffentlichte Authentifizierungslinks wiederherstellen

Plugins für den Authentifizierungsfußbereich können Links wieder wie im bestehenden Modulvertrag beim Import beitragen. Cognis beschränkt diese Beiträge auf Authentifizierungsseiten, erhält anwendungsbezogene Links, wenn ein Plugin sie entfernt, und überlässt jedem Modul die Entscheidung, welche veröffentlichten Dokumente zulässig sind. Beim direkten Einbinden wird der öffentliche Seitenkontext nun vor der Komposition gesetzt, sodass die öffentliche Lizenzseite keine Kontositzung erzwingt.

## Veröffentlichungsprüfung quellenbewusst machen

Die UI-Veröffentlichungsprüfung entfernt nun Kommentare, bevor wiederverwendbare Exporte ermittelt werden. Dadurch werden dokumentierte Beispiele nicht mit echten APIs verwechselt. Bei externen Modulen werden nur Browser-UI-Quellen geprüft; Tests, Abhängigkeiten, generierte Ausgaben, Coverage- und Build-Verzeichnisse werden übersprungen, sodass Server- oder Anbietercode keine reinen Browserregeln erhält.

## Routing unabhängig halten und ausführbare Schreibzugriffe prüfen

Die Dashboard-Oberfläche initialisiert das clientseitige Routing nun unabhängig von kontobezogenen Erweiterungen, sodass anonyme öffentliche Seiten die Navigation ohne vollständiges Neuladen beibehalten. Die Veröffentlichungsprüfung untersucht Schreibzugriffe auf das Mount-Element außerdem nur im ausführbaren Quelltext; Kommentare und JSDoc können verbotene Muster daher ohne Fehlmeldung dokumentieren.

## Commits

- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
- [5c3df5a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c3df5a3)
- [60c9a07e](https://github.com/Cognis-Labs-HQ/Cognis/commit/60c9a07e)
- [82ac645e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82ac645e)
- [841e6c76](https://github.com/Cognis-Labs-HQ/Cognis/commit/841e6c76)
- [234d0e03](https://github.com/Cognis-Labs-HQ/Cognis/commit/234d0e03)
- [5f0ad5f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f0ad5f0)
- [c44fcd61](https://github.com/Cognis-Labs-HQ/Cognis/commit/c44fcd61)
- [d317260b](https://github.com/Cognis-Labs-HQ/Cognis/commit/d317260b)
- [28e0e9f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/28e0e9f3)
