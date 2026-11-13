# Leistungsbudgets

Produktionsverkehr läuft durch das generische Image `nginx:stable-alpine` mit der eingebundenen Datei `docker/cognis-web/default.conf.template`. Die Vorlage steuert HTTP-Cache und Proxy-Header über die native Umgebungsersetzung von nginx. TLS liegt bewusst in der Verantwortung der Bereitstellung: Binden Sie eine zusätzliche native nginx-TLS-Konfiguration ein oder terminieren Sie TLS an einem Kubernetes-Ingress-Controller, externen Proxy oder CDN.

## Protokoll für gehostete Basiswerte

Führen Sie drei Lighthouse-Messungen einer gehosteten Version aus und bewahren Sie das mittlere Artefakt in CI auf: Kaltstart mit leerem Profil, Warmstart nach einem vorbereitenden Aufruf und SPA-Navigation vom Dashboard zu Einstellungen. Simulieren Sie 150 ms Umlaufzeit, 1,6 Mbps Download, 750 Kbps Upload und eine 4-fache CPU-Verlangsamung. Erfassen Sie Release-SHA, Region, Browserversion, Kalt-/Warmzustand, Anfragezahl, komprimierte Bytes, LCP, Einhängedauer der Route und API-p95.

## Budgets

| Ablauf         | Anfragen | Komprimierte Übertragung |      LCP | API-p95 |
| -------------- | -------: | -----------------------: | -------: | ------: |
| Kaltstart      |       45 |                  500 KiB | 2.500 ms |  400 ms |
| Warmstart      |       15 |                  150 KiB | 1.800 ms |  300 ms |
| SPA-Navigation |       10 |                  100 KiB | 1.500 ms |  250 ms |

Eine Optimierung wird erst akzeptiert, wenn dasselbe gehostete Protokoll keine Budgetverschlechterung gegenüber dem gespeicherten Basiswert zeigt. Untersuchen Sie zuerst Datenbankabfragen, Nutzdaten, Cache-Richtlinien und Anwendungsarbeit. Führen Sie Redis nur ein, wenn diese Messungen einen dauerhaften cachebaren Engpass belegen, den In-Process- und Web-Caches nicht lösen können.

## Produktionsressourcen

Nur deklarierte Skript-URLs und direkte Navigationsleistenregistrierungen werden als Build-Einstiegspunkte erzwungen; gewöhnliche statische Importe bleiben gebündelte Abhängigkeiten. Der UI-Build veröffentlicht deklarierte JavaScript-Beiträge des Hosts als Einstiegspunkte, auch wenn ein anderer Einstiegspunkt sie importiert. Registrierte statische Verzeichnisse von Gateways und Adaptern lösen ihre Deskriptoren zur passenden gebauten Quelldatei auf. Dadurch verwenden auch eigene URL-Präfixe die Produktionsbündel. Durch Konstruktionsabläufe ergänzte Einstellungsbereiche werden nach Autorisierung und Sichtbarkeitsprüfung über dasselbe Manifest aufgelöst. Jede Anfrage verwendet die aktuellen Deskriptoren; reine Quellressourcen und Modulressourcen mit Revisionsangaben behalten ihre maßgeblichen URLs.

Die Auflösung verwendet das vorhandene Build-Manifest und speichert keine API-Antworten zwischen. Authentifizierung und Filter für aktivierte Komponenten bleiben bei Deskriptoranfragen wirksam. Reine Quellinstallationen, nicht gebaute Ressourcen, externe Verzeichnisse und Modul-URLs mit Revisionsangaben behalten ihre ursprünglichen Auslieferungspfade.

Nur vor dem Seitenaufbau benötigte Kataloge aktivieren das Vorladen. Navigationsleistenkataloge laden weiterhin nach Bedarf, damit ihre Erkennung bei der Navigation keine parallelen Hintergrundanfragen auslöst. Nach der authentifizierten Erkennung lädt der Provider-Lader unveränderliche Host-Bündel vorab, während Importe und Einbindungen weiterhin nacheinander erfolgen. Vorladelinks werden nach Abschluss oder Fehlern entfernt. Aktive Provider werden nicht erneut vorgeladen; externe Modul-, Quell- und revisionsbezogene URLs behalten ihren bisherigen Importpfad.

## Beständige Navigation

Routen- und Dokumentaufrufe verwenden die ganzseitige Ladeanzeige. Die Lademeldung erscheint unter dem Ladesymbol mit derselben verzögerten Einblendung und bleibt während der Vorbereitung von Anbietern, des Imports, der Sitzungsprüfung und des Inhaltsaufbaus einer akzeptierten Navigation verfügbar. Überholte Navigationen geben ihre Ladefreigabe sofort zurück. Abschluss und Fehler beenden die Ladeanzeige; Fehler nutzen die vorhandenen Anzeigen. Übersetzungsabfragen im Hintergrund ändern die gewählte Sprache nicht.

Bei jedem Aufbau werden aktuelle Einstellungen einmal gemeinsam für Design- und Sprachsteuerung geladen. Nach Bereitschaft der Anbieter erfolgt eine Avatar-Aktualisierung. Unveränderte Avatar-Elemente bleiben bestehen. Verspätete Ergebnisse werden nach Konto-, Token-, Anbieter- oder Aktualisierungswechsel verworfen. Private Antworten werden nicht zwischengespeichert.

Navigationsbeginn, sichtbare Ladezeit und Bereitschaft benötigter Inhalte getrennt messen, auch bei wiederholten Routen sowie Vorwärts und Zurück. Dokument-, Shell- und Avatar-Identität sowie Anfrageabläufe aufzeichnen. Ein abgeschlossener Aufbau oder ein zunächst leeres Widget beweist keine Inhaltsbereitschaft. Lokale synthetische Messungen belegen keine Leistung im Hosting.
