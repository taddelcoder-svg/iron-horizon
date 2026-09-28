# Iron Horizon – Version 1.2

3D-Panzergefecht für die Swimming-Lions-Spielesammlung. Alle Laufzeitdateien einschließlich Three.js liegen im Repository; keine CDNs, Konten oder externen Dienste. Das Spiel hat bewusst keinen Ton.

## Starten

Aus dem Repository-Ordner mit Node.js:

```sh
npm start
```

Danach `http://localhost:10400/` öffnen. Für die Browser-Tests startet `node iron-horizon/serve.cjs` denselben Server nur auf `127.0.0.1:4177`. Veröffentlicht wird über das `Dockerfile` auf Render, geschützt durch `ZUGANG_PASSWORT` (siehe Haupt-README).

## Spielumfang

- **Drei Karten:** Grenzposten (Dorf, Hauptstraße, Wiesenflanken), Steinbruch (Felsriegel, seitliche Zufahrten) und Flusstal. Das Flusstal hat als einzige Karte Höhengelände: einen Hügelkamm im Osten, ein trockenes Flussbett im Westen und einen Bach mit Steinbrücke unter Punkt A. Beide Teams bekommen dasselbe Gelände: Grenzposten und Flusstal sind an Punkt A gespiegelt, der Steinbruch ist um 180° gedreht. Das gilt für alle Positionen, Punkt B, das Wegraster der Bots und auch Bäume und Deko.
- **Fünf Panzer:**
  - Luchs: 52 km/h, 40 mm, 3 s Nachladen.
  - Keiler: 36 km/h, 75 mm, 5 s Nachladen, Frontschutz 0,7.
  - Dachs: Jagdpanzer mit 34 km/h, 88 mm, 6,5 s Nachladen, Schadensfaktor 1,9 und Frontschutz 0,59. Er hat keinen Turm; die Kanone schwenkt nur ±12°. Steht der Dachs und lenkt der Fahrer nicht, dreht sich die Wanne selbst zum Ziel.
  - Wiesel: Spähpanzer mit 60 km/h, 25-mm-Maschinenkanone (1,5 s Nachladen, Schadensfaktor 0,3), Frontschutz 1,0, kleines Ziel. Schießt als Bot aus der Fahrt und flankiert.
  - Bär: schwerer Panzer mit 28 km/h, 105 mm, 7,5 s Nachladen, Schadensfaktor 2,05, Frontschutz 0,55, träger Turm (0,5 rad/s).
  - Luchs und Keiler sind immer verfügbar. Im Training fahren alle sofort; im Gefecht brauchen Wiesel den Rang „Fahrer“ (500 EP), Dachs „Frontkämpfer“ (1.200 EP) und Bär „Veteran“ (2.200 EP).
- **Drei Modi:**
  - Vorherrschaft: 3 gegen 3 um Punkt A.
  - Durchbruch · Angriff und Durchbruch · Verteidigung.
  - Dazu das Training mit fünf Übungszielen.
- **Gegnerstärke** (gilt nur für die Gegner; deine Verbündeten kämpfen immer wie Veteranen):
  - Rekrut: Reaktion 1,2–1,8 s, 22 mrad Zielfehler, lädt 1,4–2,4 s langsamer nach als der Panzerwert, keine Flanken, kein Rauch.
  - Veteran: Reaktion 0,8–1,3 s, 11 mrad Zielfehler, Nachladen +1–2 s. Luchse flankieren, wenn der Gegner den Punkt hält.
  - Ass: Reaktion 0,55–0,85 s, 7 mrad Zielfehler, Nachladen +0,8–1,8 s. Zielt tief auf Ketten und Seiten und gibt 25 % mehr Erfahrung.
- **Bot-Aufstellung:** Zu Beginn jedes Gefechts wird für die beiden Bot-Paare je ein Panzer ausgelost; blauer Bot 1 ↔ roter Bot 1 und blauer Bot 2 ↔ roter Bot 2 fahren dasselbe. Roter Bot 3 fährt immer deinen Panzer.

### Online-Gefechte

- „Online spielen“ in der Garage öffnet die Lobby: Raum erstellen oder mit vierstelligem Code beitreten. Der Einladungslink `…/iron-horizon/?raum=CODE` tritt direkt bei.
- Bis zu 6 Spieler, frei auf Blau und Rot verteilt; jeder wählt seinen Panzer selbst, auch doppelt. Leere Plätze füllen Bots, die den Panzer ihres Gegenübers fahren.
- Der Gastgeber wählt Karte, Modus und Bot-Stärke und startet. Sein Browser rechnet das Gefecht; jeder steuert den eigenen Panzer selbst. Der Gastgeber sollte seinen Tab im Vordergrund lassen.
- Verlässt ein Mitspieler das Gefecht, übernimmt ein Bot; verlässt der Gastgeber es, endet es für alle.
- Olympiade: Mit dem Olympia-Ticket landet die ganze Gruppe automatisch in einem Raum (Karte, Modus und Bots aus der Olympiade). Sind alle da, startet das Gefecht von selbst; am Ende meldet jeder seine Punkte.

### Vorherrschaft

- Punkt A erobern: 100 Tickets je Team, sieben Minuten Zeitlimit.
- Zehn Sekunden allein im Kreis erobern; einen gegnerischen Punkt zuvor fünf Sekunden neutralisieren. Sind beide Teams im Kreis, ruhen Eroberung und Ticketabzug.
- Ein gehaltener Punkt kostet den Gegner alle zwei Sekunden ein Ticket, ein Fahrzeugverlust fünf Tickets. Bei null Tickets oder Zeitablauf gewinnt das Team mit mehr Tickets.

### Durchbruch

- Die Angreifer müssen erst Punkt A, dann Punkt B erobern. Punkt B liegt zwischen A und der Basis der Verteidiger, im Steinbruch neben dem Felsriegel.
- Angreifer: 110 Tickets, Verteidiger unbegrenzt. Start mit fünf Minuten, jeder eroberte Punkt bringt drei Minuten.
- Eroberung braucht mindestens doppelt so viele Angreifer wie Verteidiger im Kreis: allein zehn Sekunden, gegen Verteidiger dreißig. Sonst ruht die Eroberung; verlassen die Angreifer den Kreis, sinkt der Fortschritt langsam.
- Nach der Eroberung von A steigen die Angreifer vor Punkt B wieder ein. Die Verteidiger gewinnen bei Zeitablauf oder wenn den Angreifern die Tickets ausgehen.
- Die Bots verteidigen mit einem Wächter im Kreis und zwei Überwachungsstellungen. Sobald die Eroberung beginnt, fahren alle in den Kreis.

### Kampf und Schäden

- 100 Strukturpunkte. Basisschaden: Front 24, Seite 38, Heck 50, mal Schadensfaktor des Schützen; frontal zusätzlich mal Frontschutz des Ziels. Kettentreffer richten 45 % an.
- Abpraller: Trifft ein Geschoss die Fläche flacher als 18°, prallt es ohne Schaden ab.
- Streuung: im Stand etwa 2 mrad, in voller Fahrt bis etwa 18 mrad, Lenken kommt hinzu. Der gestrichelte Kreis zeigt sie an.
- Module:
  - Kette: niedrige Seitentreffer; das Fahrzeug steht.
  - Motor: Heck; noch 40 % Antrieb.
  - Turmantrieb: Turmring; der Turm dreht mit 35 % Tempo. Beim Dachs heißt das Modul Richtantrieb und liegt nur an der Kanonenblende, etwa ein Zehntel der Front.
  - R halten repariert im Stillstand in sechs Sekunden alle Module. Bots reparieren Kette und Motor sofort, einen beschädigten Turm- oder Richtantrieb erst, wenn kein Gegner mehr zu sehen ist.
- Q legt zehn Sekunden Rauch (zwei Ladungen je Leben). Rauch unterbricht die Sicht, stoppt aber keine Geschosse.
- Geschosse fliegen mit 95 m/s und fallen leicht. Sie treffen Gebäude, Felsen, Fahrzeuge und das Gelände; im Flusstal decken Hügel und Flussbett.

### Fahren im Gelände

Auf Karten mit Höhengelände steht jedes Fahrzeug auf dem Boden und neigt sich mit dem Hang. Bergauf bremst die Steigung bis auf 45 % Tempo, bergab gibt es bis zu 15 % mehr. Sichtlinien, Zielpunkt und Kamera beachten die Geländehöhe. Die steilste Stelle des Flusstals hat eine Steigung von 0,42.

### Oberfläche

- Treffermarker am Fadenkreuz, Funken am Einschlag und ein Schadensschema neben der Geschwindigkeit.
- Die Wiedereinstiegsanzeige nennt, wer dich wo getroffen hat.
- Die Minikarte zeigt das Relief und die Punkte A und B.
- Das Ergebnis zeigt einen Schlüsselmoment, einen Tipp, die Erfahrung, neue Auszeichnungen und Tarnungen.
- Einstellungen: Mausgeschwindigkeit, Rückstoß-Kamera, Grafikstufe, Y-Achse umkehren und Bildratenanzeige. Fällt die Bildrate im Gefecht vier Sekunden lang unter 35 Bilder pro Sekunde, senkt das Spiel die Grafikstufe selbst um eine Stufe und sagt das an.

### Steuerung

- **Desktop:** WASD oder Pfeiltasten fahren, die Maus zielt, Linksklick feuert, Rechtsklick hält den Zoom. Leertaste bremst, Q legt Rauch, R halten repariert, Esc pausiert. Das Spiel fordert Pointer-Lock an; verweigert eine eingebettete Vorschau das, startet nach spätestens 1,2 s eine Ersatzsteuerung (die Maus zielt, am Bildrand dreht die Sicht weiter).
- **Touch im Querformat:**
  - Der linke Daumen setzt einen analogen Joystick; rechts dreht Wischen Turm und Blick.
  - Knöpfe: FEUER (weiterwischen zielt nach), ZOOM, RAUCH, REPARATUR und BREMSE.
  - Das Spiel schaltet bei der ersten Berührung auf Touch um und bei einem Mausklick in der Garage zurück.

## Fortschritt

Nur abgeschlossene Gefechte (Vorherrschaft oder Durchbruch) geben Erfahrung:

- 100 für die Teilnahme, 200 für einen Sieg oder 100 für ein Unentschieden.
- 75 je Abschuss, 10 je wirksamem Treffer, 3 je Sekunde am Ziel (höchstens 600).
- Auf Stufe Ass kommen 25 % dazu.

Ränge: Rekrut (0 EP), Fahrer (500), Frontkämpfer (1.200), Veteran (2.200), Panzer-Ass (3.500).

Tarnungen gelten je Panzer und verändern keine Kampfwerte:

- Dienstoliv, Wüstensand (500), Waldtarn (1.200), Wintertarn (2.200), Stadtgrau (3.500).
- Swimming Lions für die Auszeichnung „Ass-Sieg“.

Acht Auszeichnungen:

| Auszeichnung | Bedingung |
| --- | --- |
| Erster Sieg | Gewinne ein Gefecht. |
| Dreifach | Drei Abschüsse in einem Gefecht. |
| Alleingang | Erobere einen Punkt ganz allein. |
| Dickes Fell | Zehn Abpraller an deiner Panzerung, über alle Gefechte. |
| Schrauber | Repariere fertig, während ein Gegner auf dich zielt. |
| Unversehrt | Gewinne ein Gefecht ohne eigenen Verlust. |
| Ortskundig | Gewinne auf allen drei Karten. |
| Ass-Sieg | Gewinne gegen Ass-Gegner. |

Der Spielstand liegt unter `iron-horizon-career-v1` im lokalen Browser-Speicher; Export und Import als JSON-Datei mit Prüfung und Vorschau. Spielstände aus 0.5 bis 0.7 lassen sich weiter laden; Dachs-Tarnung, Auszeichnungen, Kartensiege und Abpraller starten dann bei null. Mehrere Tabs koordinieren sich über Web Locks.

## Dateien

- `index.html`, `style.css`, `battle.css`, `career.css`, `hud.css`: Garage, HUD, Touch-Knöpfe, Einsatzbesprechung, Pause, Ergebnis und Profil.
- `game.js`: Szene, Fahrzeuge, Eingabe, Gelände-Physik, Bots, Geschosse, Modi und Oberfläche. Die Konsole bietet:
  - `window.ironHorizon.sim(sekunden)` rechnet Spielzeit vor.
  - `getState()` liefert den Zustand.
  - `balance({ vehicles, map, level, seed, mission, allies, player })` spielt in der Garage ein ganzes Gefecht nur mit Bots (Spielerpanzer per Autopilot, ohne Erfahrung) und liefert Ergebnis und Abschussliste. `allies` und `player` setzen auf Wunsch eigene Stufen für die blauen Bots und den Autopiloten.
  - `sampleFrames(fps, sekunden)` prüft die automatische Grafikstufe mit künstlichen Bildzeiten.
- `battle.js`: Vorherrschaft und Durchbruch als reine Regeln, A*-Wegsuche mit Glättung, Bot-Taktik, Positionen um Punkte, Schwierigkeitsstufen, Schlüsselmoment.
- `systems.js`: Fahrzeugprofile, Module, Reparatur, Abpraller, Schaden, Streuung und Rauch-Sichtprüfung.
- `maps.js`: Kartendaten (Starts, Ziele, Überwachungsstellungen, Flanken, Punkt B, Hindernisse) und die Höhenfunktion des Flusstals.
- `terrain.js`: statische 3D-Geometrie; Reliefnetz mit Farbverlauf, Bach und Brücke für das Flusstal. Ein Kartenwechsel gibt die alte Geometrie frei.
- `online.js`: Lobby, WebSocket-Verbindung und Einladungslink; das Gefecht selbst steuert `game.js` (Gastgeber sendet Lagebilder und Ereignisse, Mitspieler ihre Eingaben).
- `../raeume.js`: Räume auf dem Server (Code, Teams, Panzer, Plätze, Weiterleitung).
- `career.js`: Erfahrung, Ränge, Tarnungen, Auszeichnungen, Fahrzeugfreischaltung, Spielstandprüfung und Speicherung.
- `vendor/three.min.js`: Three.js r128 mit MIT-Lizenz in `vendor/LICENSE-three.txt`.
- `serve.cjs`: startet `../server.js` für die Browser-Tests auf `127.0.0.1:4177`.

## Tests

`npm test` im Repository-Ordner führt die Node-Tests aus:

- `battle.test.cjs`: Eroberung, Durchbruch, Wegsuche, Taktik, Schwierigkeit, Schlüsselmoment.
- `systems.test.cjs`: Fahrzeuge einschließlich Dachs, Module, Reparatur, Abpraller, Schaden, Streuung, Rauch.
- `maps.test.cjs`: freie und erreichbare Positionen, Punkt B, Hangneigung, gespiegelte Positionen aller Karten, Drehsymmetrie des Steinbruchs, Spiegelsymmetrie des Flusstals und des Wegrasters.
- `raeume.test.cjs`: Raum erstellen und beitreten, volle Teams, nur der Gastgeber startet, Platzvergabe mit Spiegelpaaren, Weiterleitung im Gefecht, Verlassen.
- `career.test.cjs`: Erfahrung, Auszeichnungen, Tarnungen, Dachs-Freischaltung, alte Spielstände, Speicherfehler.

Die Browser-Tests brauchen Playwright, installiertes Chrome und den laufenden Server von `serve.cjs`:

- `smoke-test.cjs`: Pointer-Lock, Treffer, Fahren, Pause, Einstellungen, Bots, Startseite, Datenschutz, keine Testdateien ausgeliefert.
- `pointer-test.cjs`: verweigerter, fehlender und nicht antwortender Pointer-Lock und die Ersatzsteuerung.
- `lifecycle-test.cjs`: Ausfall durch Bot-Treffer, Wiedereinstieg, Ergebnis und Neustart.
- `systems-browser-test.cjs`: Keiler, Rauch, Reparatur, kompakte Garage.
- `maps-browser-test.cjs`: Kartenwahl, Freigabe der Geometrie, Laptop-Layout, Training, Bot-Wege.
- `career-browser-test.cjs`: Erfahrung, Speicherung, Tarnungen, Export und Import.
- `touch-browser-test.cjs`: Handy im Querformat, Joystick, Wischen, Knöpfe, Hochformat-Hinweis.
- `olymp-browser-test.cjs`: zwei Spieler mit selbst signierten Olympia-Tickets treffen sich, Start bei Vollzähligkeit, Teams geteilt, Abbruch durch den Gastgeber meldet trotzdem (lokaler Server ohne Passwort).
- `online-browser-test.cjs`: zwei Browser über den Einladungslink, freie Team- und Panzerwahl, Start, Bewegung und Schüsse des Gasts beim Gastgeber, Bots und Tickets beim Gast, Gastgeber verlässt das Gefecht (Adresse über `IH_URL`).
- `modes-browser-test.cjs`: Dachs-Sperre und Richtbereich, Relief im Flusstal, Gegnerstärke nur für Gegner, automatische Grafikstufe, Durchbruch vom Start bis zum Ergebnis, Auszeichnungen und Tarnungen im Profil.

`balance-tournament.cjs [--rounds 12] [--level veteran] [--workers 4] [--pure]` spielt alle zehn Panzerpaare als gespiegelte Aufstellung (mit `--pure` auch reine Teams) auf allen Karten und im Durchbruch durch und prüft die Balance-Regeln aus dem Konzept. Mit `--beginner` schätzt es stattdessen, wie oft ein Team mit einem Einsteiger gewinnt (Spielerpanzer auf Stufe Rekrut, Verbündete Veteran, Gegner auf jeder Stufe).
