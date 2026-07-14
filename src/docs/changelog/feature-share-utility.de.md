# Share Utility

## Share-Gateway hinzufügen

Cognis enthält jetzt ein eigenes Share-Gateway, das öffentliche Share-Tokens erstellt, auflistet, widerruft und auflöst. Das Gateway registriert kanonische Share-Flows, speichert Share-Tokens in der DB und stellt eine öffentliche `/share/:token`-Seite bereit, die auf dem Standard-Page-Composer mit reduzierter Shell basiert.

## Meetings teilen

Das Jitsi-Meet-Modul steuert jetzt Share-Flow-Hooks für Meeting-Ressourcen bei, stellt Routen zur Verwaltung von Meeting-Freigaben bereit und rendert einen Share-Button im Meeting-Bereich. Meeting-Besitzer können ablaufende Freigabelinks erzeugen, sie aus einem Popup kopieren und später widerrufen.

## Generisches Freigabelink-Popup

Das Freigabe-Popup wurde aus dem Jitsi-Meet-Modul in ein generisches Dienstprogramm `openShareLinksPopup` in `src/ui/reuse/share-links-popup.js` extrahiert. Es akzeptiert API-Callback-Funktionen und Bezeichnungsstrings als Parameter und ist somit für jede Funktion wiederverwendbar. Der Import verwendet nun einen absoluten Pfad, wodurch ein dynamischer Import-Fehler auf der Meetings-Seite behoben wird.

## Ladefehler auf der Meetings-Seite durch 401 auf share-adapter.js behoben

Der statische Top-Level-Import von `share-adapter.js` in der Meetings-`app.js` löste beim
Parsen des Moduls eine 401-Antwort aus, bevor die Benutzersitzung eine Authentifizierungsprüfung
erfüllen konnte. Dadurch wurde der Import abgebrochen und die gesamte `/meetings`-SPA-Route
konnte nicht geladen werden. `share-adapter.js` wird jetzt als lazy dynamischer Import zusammen
mit `share-links-popup.js` innerhalb des Share-Button-Click-Handlers geladen, sodass die Datei
erst angefordert wird, wenn sich der Nutzer in einer authentifizierten Sitzung befindet und
bewusst das Share-Popup öffnet.

## Verwaiste Jitsi-Meet-Dateien entfernt

Die veralteten Dateien `ui/app/index.js` und `ui/pages/meetings.html` im Jitsi-Meet-Modul wurden
durch ein früheres Refactoring zu totem Code und werden im Browser nie ausgeliefert. `index.js`
enthielt einen fehlerhaften Import (`/static/reuse/page-composer.js` statt
`/static/reuse/page-composer/index.js`), der bei einem eventuellen Aufruf einen Ladefehler
verursacht hätte. Beide Dateien wurden entfernt.

## Öffentliche Freigabelinks durch Auth-Check blockiert – behoben

Der Kalender-Gateway-Route-Handler verwendete eine zu weit gefasste Prüfung
`pathname.includes("/share")`, die versehentlich öffentliche Freigabe-Link-URLs
(`/share/shr_...`) abfing und einen Unauthorized-Fehler zurückgab, bevor das
Share-Gateway die Seite ausliefern konnte. Die Prüfung ist nun auf
kalenderspezifische Share-API-Routen unter `/api/v1/calendar/calendars/:id/share`
beschränkt.

## Fokus des Eingabefelds für Labels im Share-Popup korrigiert

Wenn das Share-Links-Popup geöffnet wird, erhält das Label-Eingabefeld nun
automatisch den Fokus. Zuvor wurde fälschlicherweise der Schließen-Button (der
erste Button im Popup-DOM) fokussiert, was direkte Tastatureingaben im Label-Feld
verhinderte.

## Client-seitige Flow-Architektur

Ein Singleton-`uiCtx`-Browser-Flow-Engine steuert jetzt alle seitenübergreifenden Browser-Belange. Auth, Seitenladen und SPA-Navigation sind als benannte, gestufte Flows ausgedrückt, die jedes Gateway oder Modul erweitern kann, ohne es zu besitzen. Die Sitzungsvalidierung liegt im Auth-Gateway, der Gast-Token-Tausch im Share-Gateway, und `page-entry.js` delegiert an den `load-page`-Flow, sodass einzelne Seiten keine Auth-Helfer mehr direkt aufrufen müssen. Der Jitsi-Meet-Wrapper `share-mount.js` wird gelöscht; die Share-Seite lädt `app.js` direkt und erkennt den Share-Kontext über das Flow-System.

## Login-Umleitungsschleife behoben

Der `load-page`-Authentifizierungshook überspringt die Auth-Prüfung nun auf öffentlichen Seiten (`/login` und `/register`). Dadurch wird eine endlose Umleitungsschleife verhindert, die entstand, weil der Import von `createPageComposer` auf diesen Seiten transitiv den Auth-Hook registrierte, der nicht authentifizierte Besucher sofort wieder zu `/login` umleitete.

## Fehler auf geteilten Meeting-Seiten behoben

Mehrere zusammenhängende Fehler verursachten Abstürze und leere Seiten beim Beitreten eines Meetings (oder beim Laden von geteilten Inhalten) über einen Share-Link.

- **Gast-Tokens bestehen jetzt Server-Auth**: Die Auth-Prüfung lehnte Share-Purpose-Tokens ab, weil `getAuthClaims` nur `purpose: "session"`-Tokens akzeptierte. Jetzt werden auch `purpose: "share"`-Tokens akzeptiert.
- **Doppeltes Mount bei dynamischem Import verhindern**: Das Share-Modul setzt jetzt `__spaRouter` vor dem dynamischen Import, um einen zweiten `load-page`-Durchlauf zu unterdrücken.
- **Gast-Token bei wiederholten Auth-Prüfungen erhalten**: `validate-stored-token` löscht die Session jetzt nur noch, wenn kein Token vorhanden ist – nicht wenn ein Token ohne Account vorliegt.
- **Totes `guestController`-Assignment entfernt**: Der veraltete Codeausdruck wurde aus den Share-Session-Flow-Hooks entfernt.
- **Seitenstile für geteilte Inhalte**: Der Jitsi-Share-Hook enthält jetzt `stylesheetUrls`; die Share-Seite lädt diese CSS-Dateien vor dem Mounten der Ressource.

## Share-Buttons Verstecken Sich Automatisch für Gäste

Jede Komponente, die einen Share-Button rendert, fragt nun das Share-Gateway, ob die aktuelle Sitzung eine Gast-Sitzung ist, und blendet den Button für Gäste vollständig aus, statt nur den Klick-Handler zu deaktivieren. Die Erstellung von Share-Buttons liegt jetzt ausschließlich beim eigenen Client-Modul des Share-Gateways, sodass das Deaktivieren des Gateways bedeutet, dass niemals ein Share-Button erstellt wird.

## Share-Fenster Nutzen Jetzt Das Vollständige Layout Angemeldeter Seiten

Das Öffnen eines Share-Links zeigt jetzt die Standard-Topbar, den Footer und das vollständige Inhaltsraster angemeldeter Seiten an, statt eines reduzierten, gebrandeten Rahmens. Anmelde-/Registrierungsaktionen bleiben für Gäste über die Topbar verfügbar.

## Gäste Erhalten Ein Temporäres Profil Pro Sitzung

Jede Gast-Sitzung erhält nun ein temporäres Anzeigeprofil (Name/Avatar), das nach Ablauf automatisch bereinigt wird. Jitsi Meet verwendet dieses temporäre Profil, wenn es Jitsi Meet über die Identität des Gastes informiert und wenn der Gast eine Chatroom-Nachricht sendet.

## Gäste Werden Am Verlassen Des Share-Links Gehindert

Versucht ein Gast, zu einer anderen Seite zu navigieren, erklärt ein Popup, dass Gäste diese Seite nicht ansehen können, und bringt ihn zurück zum Share-Link.

## Gäste Sehen Nur Teilnehmer, Die Dies Erlauben

Geteilte Meetings verbergen jetzt Teilnehmer, deren Sichtbarkeitseinstellung anonyme/Gast-Betrachter ausschließt, sowohl in der ursprünglichen Share-Payload als auch im Live-Meeting-Status.

## Das Erstellen Eines Share-Links Erfordert Jetzt Die Zustimmung Anderer Teilnehmer

Wird ein Share-Link für eine Entität mit weiteren zugehörigen Nutzern angefordert (z. B. ein Meeting), erhalten diese Nutzer ein Popup mit Zustimmen-/Ablehnen-Option. Lehnt jemand ab, wird der Share-Link nicht erstellt. Popups stimmen nach 60 Sekunden automatisch zu, wenn niemand reagiert.

## Share-Popup Aktualisiert Sich Ohne Fokusverlust

Das Share-Links-Popup rendert das Erstellungsformular und die Linkliste jetzt als getrennte DOM-Bereiche. Die Eingabefelder für Bezeichnung und Ablaufzeit bleiben während Aktualisierungen nach Erstellen-/Widerrufen-Aktionen sowie beim Hintergrund-Polling alle 10 Sekunden erhalten, sodass Nutzer weiter tippen können, ohne die Cursorposition zu verlieren. Bestehende Links zeigen die Share-URL außerdem direkt als Kopier-Schaltfläche neben dem Titel an, wodurch das Popup kompakter wird.

## Share-Links Erhalten E-Mail-Schnellaktionen

Share-Datensätze können jetzt gatewayseitig aufgelöste Schnellaktionen enthalten, die von aktiven Benachrichtigungssendern stammen. Der SMTP-Adapter stellt eine `mailto:`-Schnellfreigabe-Fähigkeit bereit, und das Share-Gateway ergänzt bei aktiven SMTP-Sendern automatisch eine E-Mail-Aktion in jedem an Clients ausgelieferten Share-Datensatz.

## Behebung nicht abgefangener Profilfehler bei Meeting-API-Aufrufen

Mehrere Jitsi-Meet-Routen (`meetings/active` sowie jede Route, die auf `resolveMeetingPayloadOrReject` aufbaut, darunter `get`, `preflight`, `probe`, `join`, `reclaim`, `presence`, die `auth-*`-Routen, `state` und `chat-room-summary`) riefen `resolveRequesterUsername` auf, ohne den Fehler zu behandeln, den die Funktion wirft, wenn der Aufrufer kein sichtbares Profil-Handle besitzt. Die nicht abgefangene Ausnahme wurde vom generischen Fehler-Handler des Servers abgefangen und als wenig hilfreicher `400 Bad Request` bei jeder Anfrage ausgegeben, anstatt der `409 profile_required`-Antwort, die `meetings/create` bereits verwendet. Diese Aufrufstellen behandeln den Fehler jetzt einheitlich und liefern `409 profile_required`.

## Share-Links öffnen das Mailprogramm in einem neuen Tab

Die E-Mail-Schnellaktion öffnet `mailto:`-Links jetzt mit `target="_blank"`, sodass das Verfassen einer Nachricht den aktuellen Tab nicht mehr durch eine leere Navigation ersetzt.

## Fehlendes E-Mail-Symbol im Share-Popup behoben

Die Mail-Icon-Datei liegt jetzt im eigenen `ui/reuse`-Verzeichnis des Share-Gateways (in sich geschlossen mit dem Rest des Gateways) statt an einem generischen öffentlichen Asset-Pfad und wird als themenfähiges Masken-Icon gerendert, das immer zur Button-Farbe passt, statt als `<img>`, dessen internes `currentColor` nie das Seitendesign übernahm.

## Gäste sehen jetzt einen Bildschirm "Share abgelaufen/gelöscht" statt einer Login-Weiterleitung

Der Aufruf eines abgelaufenen, widerrufenen oder anderweitig nicht auflösbaren Share-Links leitet Gäste nicht mehr zwangsweise zu `/login` weiter. Der `authenticate-session`-Flow erkennt jetzt eine fehlgeschlagene Share-Token-Auflösung und lässt die Share-Seite ihren eigenen Fallback-Bildschirm für abgelaufene/gelöschte Links rendern.

## Share-Link-Bezeichnung wird nach dem Erstellen geleert

Das Feld für die benutzerdefinierte Bezeichnung im Share-Links-Popup wird jetzt sofort nach erfolgreichem Erstellen eines Links geleert, sodass das Erstellen eines weiteren Links mit einer leeren Bezeichnung beginnt, statt die vorherige zu übernehmen.

## Share-Links zeigen jetzt Status Aktiv/Abgelaufen und Ablaufzeit

Jeder Share-Link im Popup zeigt jetzt ein Statusabzeichen „Aktiv“ oder „Abgelaufen“ sowie das lokale Datum und die Uhrzeit (in der Zeitzone des Benutzers), zu dem der Link abläuft oder abgelaufen ist. Abgelaufene Share-Tokens werden jetzt für eine kurze Karenzzeit aufbewahrt, statt sofort beim Ablauf gelöscht zu werden, sodass Eigentümer sie weiterhin als „Abgelaufen“ sehen können, bevor die automatische Bereinigung sie entfernt.

## Kontrastproblem im Hellmodus des Share-Links-Popups behoben

Die Zeilen der Share-Links verwendeten einen fest codierten dunklen Hintergrund und Textfarben, die das aktive Theme ignorierten, wodurch sie selbst im Hellmodus mit einem zu dunklen Hintergrund dargestellt wurden. Das Popup verwendet jetzt die gemeinsamen Theme-Variablen, sodass es sich korrekt an Hell- und Dunkelmodus anpasst.

## Endlos-Ladeanimation bei abgelaufenen Share-Seiten behoben

Der Aufruf eines abgelaufenen oder ungültigen Share-Links führte dazu, dass die Seite endlos lud, statt den Bildschirm für abgelaufene Links anzuzeigen. `renderDashboardLayout` ging immer davon aus, dass eine fehlgeschlagene Sitzungsprüfung eine bevorstehende Weiterleitung bedeutet, und hielt absichtlich an, um ein kurzes Aufblitzen von Inhalten zu vermeiden. Share-Seiten rufen dieselbe Sitzungsprüfung auf, erhalten bei einer fehlgeschlagenen Share-Auflösung jedoch bewusst keine Weiterleitung, damit sie ihren eigenen Fallback-Bildschirm anzeigen können. Eine neue Composer-Option `requireAccountSession` (die Standardeinstellung entspricht dem bisherigen Verhalten überall sonst) erlaubt der Share-Seite, dieses Anhalten zu umgehen, damit ihr eigener Bildschirm für abgelaufene/gelöschte Links angezeigt werden kann.

## Fehlendes Standard-CSS auf geteilten Meeting-Seiten behoben

Meeting-Seiten, die über einen Share-Link eingebunden wurden, wurden in eine kleine Standardkarte gequetscht statt im vollen Seitenlayout dargestellt. Die Rastergröße der eingebetteten App auf der Share-Seite verwendete `max: ["full", "full"]`, was im Page-Composer kein erkanntes Token ist (nur der skalare Wert `max: "full"` aktiviert das Vollbreiten-Layout) und stillschweigend auf die kleine Standardkarte zurückfiel. Die Rastergröße des Share-Elements ist für eingebettete Apps jetzt `max: "full"`, und der eigene innere Composer der Jitsi-Meet-Seite erhält jetzt ebenfalls `frameless: true`, wenn er innerhalb einer Share-Ansicht gerendert wird, sodass er zum äußeren Composer der Share-Seite passt, statt sein normales, kartenartiges Padding beizubehalten.

## Zugriff von Gästen auf den Meeting-Chat behoben

Gäste, die über einen Share-Link an einem Meeting teilnahmen, wurden vom Meeting-Chat blockiert. Zwei Ursachen wurden behoben:

- **Meetings ohne weitere Teilnehmer erhielten nie einen Chatraum.** Meetings werden häufig zunächst allein erstellt und erst danach geteilt, aber die Erstellung eines Chatraums erforderte mindestens zwei echte Konten. Die Chatraum-Auflösungsfähigkeit akzeptiert jetzt eine Option `allowSingleMember`, und die Meeting-Erstellung nutzt sie, sodass allein gehostete Meetings weiterhin einen Chatraum erhalten, auf den Gäste zugreifen können.
- **Share-Links, die vor der ersten Instanz eines Meetings erstellt wurden, schlugen immer als „abgelaufen“ fehl.** Die Zugriffsprüfung für Share-Links verlangte, dass die im Link gespeicherte Meeting-Instanz-ID exakt mit der aktuellen Instanz-ID des Meetings übereinstimmt, aber ein im Voraus geteilter Link hat noch keine Instanz-ID. Die Prüfung lehnt einen Link jetzt nur ab, wenn sowohl der Link als auch das Meeting eine konkrete, abweichende Instanz-ID besitzen (d. h. das Meeting wurde seit der Erstellung des Links neu gestartet).

## Copy-Link-Symbol verwendet gemeinsame Zwischenablage-Hilfsfunktion

Die Zwischenablage-Kopierfunktion, die zuvor im Runtime-Error-Popup dupliziert war, wurde zu einem generischen Dienstprogramm `copyTextToClipboard` in `src/ui/reuse/clipboard.js` erhoben. Das Copy-Link-Symbol im Share-Links-Popup sowie die automatische Kopierfunktion beim Erstellen eines Links verwenden diese Funktion jetzt statt `navigator.clipboard.writeText` direkt aufzurufen, sodass eine fehlende oder blockierte Zwischenablage-API zu einer Fehlermeldung statt zu einem stillen Fehlschlag führt.

## Gastansicht zeigt kein Teilnehmersuche-Panel mehr

Das Teilnehmersuche-/Aktive-Meetings-Panel der Jitsi-Meet-Seite wurde bisher immer in das Seitenlayout aufgenommen, auch für Gäste, die über einen Share-Link beitreten und kein Konto haben und es nicht nutzen können. Das Panel wird jetzt in der Share-/Gastansicht vollständig weggelassen, statt nur unsichtbar gerendert zu werden.

## Share-Link-Liste zeigt jetzt den Ablauf nach einem Meeting-Neustart korrekt an

Das Share-Links-Popup zeigte Links aus einer früheren Meeting-Instanz weiterhin als „Aktiv" an, obwohl Gäste, die sie verwendeten, von der Zugriffsprüfung bereits als abgelaufen abgewiesen wurden, da der Listen-Endpunkt nur die Ablaufzeit jedes Tokens betrachtete und die gespeicherte Meeting-Instanz-ID nie mit der aktuellen Instanz des Meetings verglich. Das Share-Gateway stellt jetzt die gespeicherten Metadaten jedes Tokens bereit, und die Meeting-Share-Liste kennzeichnet jeden Link, dessen gespeicherte Instanz-ID nicht mehr mit der aktuellen Instanz des Meetings übereinstimmt, als „Abgelaufen", sodass Hosts und Teilnehmer den korrekten Status sehen statt eines lebendig wirkenden toten Links.

## Share-Seitenaktionen verfeinert

Share-Link-Zeilen kopieren ihre URL jetzt über einen ausdrücklichen Button, statt sich wie Navigationslinks zu verhalten. Die Aktionen im Popup für eingeschränkten Zugriff verwenden neutrale Button-Stile, und eingebettete Share-Seiten können eine Page-Composer-Platzierung mit voller Breite und voller Höhe anfordern. Abgelaufene oder nicht verfügbare Share-Links zeigen ihren Status nun außerdem in der Seitenbeschreibung, statt den generischen Untertitel für geteilte Inhalte zu wiederholen.
