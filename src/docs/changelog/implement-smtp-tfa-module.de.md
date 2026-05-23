# SMTP-TFA-Isolierung

## SMTP-TFA-Adapterkennung umbenannt

Die interne Auth-Adapter-ID und Paketkennung wurde von `email-tfa` auf `smtp-tfa` umgestellt, während die Benutzerbezeichnung „Email TFA“ erhalten bleibt.

## Hart codierte Adapter-ID-Abhängigkeit im Auth-Gateway entfernt

Die TFA-Adapterauflösung im Auth-Gateway verwendet jetzt Fähigkeits-Hooks statt fester Adapter-IDs, damit das Verhalten adaptergesteuert bleibt.

## Adapterabhängigkeiten im Einstellungs-Popup anzeigen

Adapter-Einstellungs-Popups zeigen nun Abhängigkeitslinks mit demselben Linkverhalten wie bei Komponentenabhängigkeiten, einschließlich Adapterzielen.

## SMTP-TFA-Tests in Adaptertests verlagert

Die SMTP-TFA-Abdeckung wurde aus den Auth-Gateway-Tests entfernt und als dedizierte Adaptertests unter `src/adapters/auth/smtp-tfa/tests/` ergänzt.

## TFA-Steuerung in Administration ergänzt

Im Bereich Administration → Sicherheit wurde ein neuer TFA-Abschnitt mit Tabellen für verfügbare und aktive Methoden, Drag-and-drop-Aktivierung und einem Erzwingen-Schalter ergänzt, der ohne funktionsfähige Methoden deaktiviert ist.

## TFA-Onboarding für neue Nutzer erzwungen

Bei aktivierter Erzwingung wurde ein verpflichtender TFA-Onboarding-Ablauf für neue Nutzer ergänzt, inklusive Setup-Status-APIs und nicht schließbarer Setup-Popups, die bei SMTP-TFA eine verifizierte E-Mail erzwingen können.
