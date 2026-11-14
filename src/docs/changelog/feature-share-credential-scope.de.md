# Geteilte Zugriffe begrenzen

**Feature-Zweig:** feature-share-credential-scope

## Konto- und Gastgrenzen

Gewöhnliche Kontoprüfungen akzeptieren nur bestätigte Sitzungsanmeldungen. Gastfähige Ressourcen prüfen ausdrücklich die aktuelle Share-Freigabe und anschließend ihre Ressourcen- und Aktionsberechtigungen. Geteilte Kalenderereignisse, delegierte Chats, Gastschlüsselbunde und schreibgeschützte Lernkarten behalten begrenzten Zugriff.

## Bestätigte Sitzungsidentität

Auth und Share im Browser unterscheiden bestätigte Anmeldungen statt Kontonamenpräfixen oder Speichermarkierungen. Persönliche Lernaktivitäten, Profilverfügbarkeit und Offline-Übertragung unterstützen berechtigte Konten mit Präfixen und behalten bestehende Gastbeschränkungen. Verspätete Anmeldeergebnisse ersetzen keine neuere Sitzung.

## Änderungen

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2a5c1863cf64383bcacfcee1dabe157ad0321b21
