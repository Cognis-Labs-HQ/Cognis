# SMTP-Zustellungsfix

## Besserer EHLO-Fallback

Der SMTP-Adapter ermittelt den EHLO-Hostnamen jetzt robuster, wenn `HOST` nicht gesetzt ist. Er verwendet zuerst `ehloHostname`, dann die Absender-Domain aus `from`, danach den SMTP-Host und erst zuletzt `localhost`.

Dadurch werden SMTP-Ablehnungen reduziert, wenn Server `EHLO localhost` nicht akzeptieren.

## SMTP-Regressionstest

Ein gezielter SMTP-Adapter-Test stellt nun sicher, dass der Testmail-Versand den EHLO-Fallback über die Absender-Domain nutzt, wenn kein `HOST`-Umgebungswert vorhanden ist.

## Klarere SMTP-Testfehler

Die SMTP-Testendpunkte liefern jetzt strukturierte und nutzersichere Fehlerdetails, statt in eine generische Bad-Request-Antwort zu fallen. Bei SMTP-Befehlsfehlern (zum Beispiel einer `RCPT TO`-Ablehnung) enthält die API nun den fehlgeschlagenen SMTP-Befehl und den Servercode.

Der Testmail-Ablauf in der Administration liest diese API-Fehlerdaten jetzt aus und zeigt die konkrete Fehlermeldung direkt im Toast an, sodass Betreiber sofort sehen, warum die Zustellung abgelehnt wurde.
