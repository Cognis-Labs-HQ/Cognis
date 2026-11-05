# Komponentenwiederherstellung

## Fehler isolieren

Browser-Anbieterkataloge enthalten serverseitig ermittelte Modul-, Gateway- oder Adapterzugehörigkeiten. Bei einem Fehler verliert ein optionaler Anbieter alle Fähigkeiten, Abläufe und Listener seiner Komponente. Andere Komponenten werden weiter geladen; eine übersetzte Fehlermeldung erscheint als Toast. Derselbe Katalog bleibt bis zu einer ausdrücklichen Aktualisierung oder einer neuen Eigentümerrevision isoliert. Erforderliche, kritische und unbekannte Eigentümer sowie Anbieter von Offline-Richtlinien sperren bei Fehlern den Zugriff. Erforderliche und kritische Komponenten dürfen weder automatisch noch manuell deaktiviert werden. Geschützte Verbraucher verhindern außerdem das Deaktivieren ihrer Abhängigkeiten.

Unerwartete Ausnahmen in Serverrouten werden dem registrierten Gateway, Adapter oder Modul zugeordnet. Erwartete Clientfehler und fehlerhaftes JSON zählen nicht zum Fehlerbudget. Von Administratoren beobachtete Serverfehler nutzen denselben Schutz vor wiederholten Fehlern. Anfragedaten können keinen anderen Eigentümer bestimmen. Antworten anderer Komponenten funktionieren weiterhin.

## Automatische Deaktivierung

Drei unterschiedliche, von Administratoren gemeldete Anbieterfehler innerhalb von fünf Minuten lösen die vorhandene authentifizierte Deaktivierung aus. Meldungen werden mit der aktuellen Serverregistrierung abgeglichen, anhand ihrer Ereigniskennung dedupliziert, im Arbeitsspeicher begrenzt und nach Komponentenversion getrennt. Meldungen anderer Nutzer zählen nicht zur globalen Deaktivierung. Zähler werden beim Serverneustart oder nach Ablauf des Zeitfensters zurückgesetzt. Erfolgreiches Deaktivieren wird über den normalen Lebenszyklus gespeichert und aktualisiert den Katalog. Reparieren oder aktualisieren Sie die Komponente vor dem erneuten Aktivieren.

## Befehlszeilenoperationen

Verwenden Sie die folgenden Befehle im laufenden Cognis-Container mit dessen üblichen CLI-Zugangsdaten. Bei Adaptern folgt auf die Gateway-ID die Adapter-ID. `--all` lässt sich auf einen Typ oder die Adapter eines Gateways beschränken. Sammeloperationen beachten die Abhängigkeitsreihenfolge, überspringen geschützte oder vom Host verwaltete Ziele und fahren nach einzelnen Fehlern fort. Sie geben jedes Ergebnis aus und beenden sich bei einem fehlgeschlagenen Ziel mit einem Fehlerstatus. Aktivieren und Deaktivieren einzelner Ziele verwenden nun dasselbe Ergebnislistenformat. Konfigurationsänderungen und Repository-Importe bleiben auf einzelne Ziele beschränkt.

```sh
cognisctl component:info module study-language-en
cognisctl component:info --all
cognisctl component:release-channel list module study-language-en
cognisctl component:release-channel set module study-language-en feature-guided-tutorials
cognisctl component:release-channel get module study-language-en
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all
cognisctl component:disable module --all
cognisctl component:enable adapter study --all
```

## Kanäle und Aktualisierungen

Abrufen, Setzen und Auflisten von Veröffentlichungskanälen verwendet Zweige und Veröffentlichungen der konfigurierten Marktplatzquelle. Die Auswahl wird atomar in `config/component-channels.json` gespeichert. Aktualisierungen verwenden diese Auswahl oder den installierten Zweig sowie den vorhandenen Installer, Abhängigkeitsprüfungen, Integritätsregeln und Berechtigungen. Zuvor aktive Module werden für die Aktualisierung vorübergehend deaktiviert. Laufende Installationsaufträge werden bis zum Abschluss abgefragt. Nach fehlgeschlagenen Installationen wird die regulär geprüfte Reaktivierung versucht. Erfolgreiche Aktualisierungen melden erforderliche Serverneustarts. Nach einer Zeitüberschreitung bleibt ungewisse Arbeit deaktiviert. Mitgelieferte Gateways, Adapter und Core-Module werden über die Host-Bereitstellung aktualisiert; ihre eigenständige Kanalliste ist leer und das Setzen eines Kanals wird abgewiesen.

## Öffentliche Verträge

Der Vertrag `component:management` in Version eins gehört zur API-Komponente und wird über `system:contracts` veröffentlicht. Abfragen, Kanalauswahl, Änderungen und Fehlermeldungen führen benannte `component:*`-Abläufe aus. `/api/v1/components` und seine Verwaltungsoperationen erfordern Administratorrechte. Authentifizierte Nutzer dürfen registrierte Anbieterfehler melden, können darüber jedoch keine Komponente global deaktivieren. Fachliche Aktionen verwenden weiterhin die ursprünglichen authentifizierten Verwaltungsrouten. Anbietermetadaten enthalten die kanonische Zugehörigkeit, Version sowie erforderlichen und kritischen Schutz, auch bei inhaltsgehashten Ressourcen.
