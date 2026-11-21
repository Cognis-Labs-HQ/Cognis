# Geteilte Zugriffe begrenzen

**Feature-Zweig:** feature-share-credential-scope

## Konto- und Gastgrenzen

Gewöhnliche Kontoprüfungen akzeptieren nur bestätigte Sitzungsanmeldungen. Gastfähige Ressourcen prüfen ausdrücklich die aktuelle Share-Freigabe und anschließend ihre Ressourcen- und Aktionsberechtigungen. Geteilte Kalenderereignisse, delegierte Chats, Gastschlüsselbunde und schreibgeschützte Lernkarten behalten begrenzten Zugriff.

## Bestätigte Sitzungsidentität

Auth und Share im Browser unterscheiden bestätigte Anmeldungen statt Kontonamenpräfixen oder Speichermarkierungen. Persönliche Lernaktivitäten, Profilverfügbarkeit und Offline-Übertragung unterstützen berechtigte Konten mit Präfixen und behalten bestehende Gastbeschränkungen. Verspätete Anmeldeergebnisse ersetzen keine neuere Sitzung.

## Änderungen

- [7e5d3d04323e4c3109e364d39f063d650ad63629](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e5d3d04323e4c3109e364d39f063d650ad63629)
- [56c4ec2f65332bf0e3b64dcf57c17fd49210df24](https://github.com/Cognis-Labs-HQ/Cognis/commit/56c4ec2f65332bf0e3b64dcf57c17fd49210df24)
