# SMTP-Zustellungsfix

## Besserer EHLO-Fallback

Der SMTP-Adapter ermittelt den EHLO-Hostnamen jetzt über den konfigurierten SMTP-Relay-Host und fällt nur als letzte Option auf `localhost` zurück.

Dadurch werden SMTP-Ablehnungen reduziert, wenn Server `EHLO localhost` nicht akzeptieren.

## SMTP-Regressionstest

Gezielte SMTP-Adapter-Tests stellen nun sicher, dass der Testmail-Versand die EHLO-Identität des Relay-Hosts statt der Absender-Domain verwendet.

## Klarere SMTP-Testfehler

Die SMTP-Testendpunkte liefern jetzt strukturierte und nutzersichere Fehlerdetails, statt in eine generische Bad-Request-Antwort zu fallen. Bei SMTP-Befehlsfehlern (zum Beispiel einer `RCPT TO`-Ablehnung) enthält die API nun den fehlgeschlagenen SMTP-Befehl und den Servercode.

Der Testmail-Ablauf in der Administration liest diese API-Fehlerdaten jetzt aus und zeigt die konkrete Fehlermeldung direkt im Toast an, sodass Betreiber sofort sehen, warum die Zustellung abgelehnt wurde.

## HELO-Identität delegieren

Die SMTP-Zustellung leitet die EHLO/HELO-Identität nicht mehr aus `HOST` oder der Absenderdomain aus `from` ab. Der Adapter meldet sich jetzt mit dem konfigurierten SMTP-Relay-Host und fällt nur auf `localhost` zurück, wenn kein Relay-Host verfügbar ist.

Damit wird die Absender-Identitätsrichtlinie dem benachbarten Mailserver überlassen, statt App-seitige HELO-Identitäten zu erzwingen, die SPF-`helo`-Ablehnungen auslösen können.
