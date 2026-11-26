# Anwendung

Praktische Abläufe für Registrierungseinladungen.

## Voraussetzungen

Die Einladungsrichtlinie gilt; separate Tokens benötigen Administrator- oder Inhaberrechte.

## Beispiele

Sende mit `cognisctl invite:email:send person@example.com` eine Mail oder erzeuge mit `cognisctl invite:token:generate` einen erlaubten separaten Link.

Administratoren und Gründer versenden Einladungen über die Benutzerseite. Externe Authentifizierungsanbieter übergeben ihre verifizierte E-Mail-Adresse und das Registrierungstoken über den Ablauf zur Freigabe der Kontoerstellung, anstatt den Adapter zu importieren.

## Erwartete Ergebnisse

Einlösen erstellt das erlaubte Konto und verbraucht die Einladung; erfolgreiche Zustellung ersetzt ältere offene Einladungen.

## Fehlerbehebung

Prüfe Ablauf, eingeladene Adresse, Richtlinie und Zustellung. Gründer dürfen höchstens zehn offene Einladungen halten.
