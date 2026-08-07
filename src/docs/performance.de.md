# Leistungsbudgets

Produktionsverkehr endet am Proxy `cognis-web`. Er lauscht immer auf HTTP und aktiviert HTTPS einschließlich der Umleitung von HTTP zu HTTPS, wenn beide konfigurierten TLS-Zertifikatdateien vorhanden und lesbar sind. Ohne verwendbare Zertifikate bleibt er für den Betrieb hinter einem Reverse Proxy oder CDN auf HTTP beschränkt. In beiden Fällen gilt dieselbe Cache-Richtlinie.

## Protokoll für gehostete Basiswerte

Führen Sie drei Lighthouse-Messungen einer gehosteten Version aus und bewahren Sie das mittlere Artefakt in CI auf: Kaltstart mit leerem Profil, Warmstart nach einem vorbereitenden Aufruf und SPA-Navigation vom Dashboard zu Einstellungen. Simulieren Sie 150 ms Umlaufzeit, 1,6 Mbps Download, 750 Kbps Upload und eine 4-fache CPU-Verlangsamung. Erfassen Sie Release-SHA, Region, Browserversion, Kalt-/Warmzustand, Anfragezahl, komprimierte Bytes, LCP, Einhängedauer der Route und API-p95.

## Budgets

| Ablauf         | Anfragen | Komprimierte Übertragung |      LCP | API-p95 |
| -------------- | -------: | -----------------------: | -------: | ------: |
| Kaltstart      |       45 |                  500 KiB | 2.500 ms |  400 ms |
| Warmstart      |       15 |                  150 KiB | 1.800 ms |  300 ms |
| SPA-Navigation |       10 |                  100 KiB | 1.500 ms |  250 ms |

Eine Optimierung wird erst akzeptiert, wenn dasselbe gehostete Protokoll keine Budgetverschlechterung gegenüber dem gespeicherten Basiswert zeigt. Untersuchen Sie zuerst Datenbankabfragen, Nutzdaten, Cache-Richtlinien und Anwendungsarbeit. Führen Sie Redis nur ein, wenn diese Messungen einen dauerhaften cachebaren Engpass belegen, den In-Process- und Web-Caches nicht lösen können.
