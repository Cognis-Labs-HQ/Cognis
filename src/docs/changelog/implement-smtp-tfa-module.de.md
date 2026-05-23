# SMTP-TFA-Isolierung

## SMTP-TFA-Adapterkennung umbenannt

Die interne Auth-Adapter-ID und Paketkennung wurde von `email-tfa` auf `smtp-tfa` umgestellt, während die Benutzerbezeichnung „Email TFA“ erhalten bleibt.

## Hart codierte Adapter-ID-Abhängigkeit im Auth-Gateway entfernt

Die TFA-Adapterauflösung im Auth-Gateway verwendet jetzt Fähigkeits-Hooks statt fester Adapter-IDs, damit das Verhalten adaptergesteuert bleibt.

## Adapterabhängigkeiten im Einstellungs-Popup anzeigen

Adapter-Einstellungs-Popups zeigen nun Abhängigkeitslinks mit demselben Linkverhalten wie bei Komponentenabhängigkeiten, einschließlich Adapterzielen.

## SMTP-TFA-Tests in Adaptertests verlagert

Die SMTP-TFA-Abdeckung wurde aus den Auth-Gateway-Tests entfernt und als dedizierte Adaptertests unter `src/adapters/auth/smtp-tfa/tests/` ergänzt.
