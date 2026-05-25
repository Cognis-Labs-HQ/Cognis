# SMTP-Zustellungsfix

## Besserer EHLO-Fallback

Der SMTP-Adapter ermittelt den EHLO-Hostnamen jetzt robuster, wenn `HOST` nicht gesetzt ist. Er verwendet zuerst `ehloHostname`, dann die Absender-Domain aus `from`, danach den SMTP-Host und erst zuletzt `localhost`.

Dadurch werden SMTP-Ablehnungen reduziert, wenn Server `EHLO localhost` nicht akzeptieren.

## SMTP-Regressionstest

Ein gezielter SMTP-Adapter-Test stellt nun sicher, dass der Testmail-Versand den EHLO-Fallback über die Absender-Domain nutzt, wenn kein `HOST`-Umgebungswert vorhanden ist.
