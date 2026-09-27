# Iron Horizon – Prototyp 0.7

3D-Panzergefecht und Testgelände für die Swimming-Lions-Spielesammlung. Alle Laufzeitdateien einschließlich Three.js liegen im Repository; keine CDNs, Konten oder externen Dienste nötig.

## Starten

Aus dem Repository-Ordner mit Node.js:

```sh
npm start
```

Danach `http://localhost:10400/` öffnen. Für die Browser-Tests startet `node iron-horizon/serve.cjs` denselben Server nur auf `127.0.0.1:4177`. Veröffentlicht wird über das `Dockerfile` auf Render, geschützt durch `ZUGANG_PASSWORT` (siehe Haupt-README).

## Spielumfang

- Vorherrschaft: Du und zwei verbündete Bots gegen drei gegnerische Bots.
- Zwei Karten in der Garage: Grenzposten mit Dorfstraßen und Waldflanken, Steinbruch mit Felsbarrieren, seitlichen Zufahrten, Silos und Kran. Die Auswahl bleibt gespeichert und gilt für Gefecht und Training. Straßen, Deckung, Minikarte, Startplätze, Übungsziele und Punkt A passen sich an die Karte an.
- Punkt A erobern, 100 Tickets je Team, sieben Minuten Zeitlimit und Ergebnisbildschirm.
- Zehn Sekunden erobern, gegnerischen Punkt zuvor fünf Sekunden neutralisieren. Beide Teams im Punkt unterbrechen Eroberung und Ticketabzug.
- Besitz bleibt beim Verlassen erhalten. Ein gehaltener Punkt kostet den Gegner alle zwei Sekunden ein Ticket, ein Fahrzeugverlust fünf Tickets.
- Wiedereinstieg nach sechs Sekunden mit drei Sekunden Startschutz, der beim eigenen Schuss endet.
- Alle Start-, Ziel-, Überwachungs- und Flankenpositionen liegen für beide Teams spiegelgleich zu Punkt A (Kartendaten in `maps.js`, Paare: blauer Bot 1 ↔ roter Bot 1, blauer Bot 2 ↔ roter Bot 2, Spieler ↔ roter Bot 3). Das Training startet weiter vorn, damit die Ziele gut erreichbar bleiben.
- Gegnerstärke in der Garage: Rekrut (Reaktion 1,2–1,8 s, 18 mrad Zielfehler, keine Flanken, kein Rauch), Veteran (0,8–1,3 s, 11 mrad) und Ass (0,5–0,8 s, 6 mrad, zielt tief auf Ketten und Seiten, zieht sich beim Nachladen zurück, +25 % Erfahrung).
- Bei null Tickets oder Zeitablauf endet das Gefecht. Mehr Tickets gewinnen; gleiche Tickets ergeben ein Unentschieden.
- Bots planen Wege mit A* in acht Richtungen und glätten sie, damit sie nicht im Zickzack fahren. Taktik (`botObjective` in `battle.js`): Ist Punkt A nicht sicher im eigenen Besitz, fahren sie hinein; schnelle Luchse nehmen dabei oft erst eine weite Flanke. Ist der Punkt gesichert, bleibt ein Wächter im Kreis und die anderen beziehen Überwachungsstellungen. Bots mit wenig Struktur ziehen sich nach Treffern zurück und legen manchmal Rauch. Nach Sichtverlust zielen sie drei Sekunden auf die zuletzt gesehene Position. Der Keiler hält zum Schießen kurz an, der Luchs schießt aus der Fahrt. Verbündete blockieren Schüsse, nehmen aber keinen Schaden.
- Fahrzeugwahl in der Garage: Luchs (52 km/h, 40 mm, 3 Sekunden Nachladen) oder Keiler (36 km/h, 75 mm, 5 Sekunden Nachladen). Die Auswahl bleibt lokal gespeichert. Auch die Bot-Teams nutzen beide Fahrzeugtypen.
- 100 Strukturpunkte; Basisschaden für den Luchs: Front 24, Seite 38, Heck 50. Der Keiler verursacht mit seiner Kanone den Faktor 1,45 und nimmt frontal nur den Faktor 0,7. Kettentreffer verursachen 45 % des sonstigen Strukturschadens. Der endgültige Schaden wird gerundet.
- Abpraller: Trifft ein Geschoss die getroffene Fläche flacher als 18° (mehr als 72° zur Flächennormalen), prallt es ohne Schaden ab. Die Meldungen unterscheiden „Abpraller“, „Durchschlag · Front/Seite/Heck“, beschädigte Module und „Fahrzeug ausgeschaltet“.
- Streuung: Im Stand beträgt die Streuung etwa 2 mrad, in voller Fahrt bis etwa 18 mrad, Lenken kommt hinzu; der Keiler streut 25 % mehr. Der gestrichelte Kreis um das Fadenkreuz zeigt die aktuelle Streuung.
- Beide Panzer haben unterschiedliche Beschleunigung, Turmdrehung und Wendigkeit sowie eine sichtbare Größen- und Geschützvariation.
- Mausgesteuerte Kamera, unabhängiger Turm mit begrenzter Drehgeschwindigkeit, Zoom.
- Geschosse mit Flugzeit, leichtem Fall und Kollisionsprüfung.
- Niedrige seitliche Treffer können die Kette ausschalten; Treffer auf den hinteren Motorbereich reduzieren die Antriebsleistung auf 40 %; Treffer auf den Turmring blockieren den Turmantrieb, der Turm dreht dann nur noch mit 35 % Tempo. Ein Schadensschema neben der Geschwindigkeit zeigt ausgefallene Module.
- R im Stillstand sechs Sekunden halten repariert Kette, Motor und Turmantrieb, aber keine Strukturpunkte. Loslassen, Fahr-/Lenkbefehl, eigener Schuss oder neuer Schaden brechen den Fortschritt ab. Bots halten für ihre eigenen Reparaturen ebenfalls an.
- Q legt zehn Sekunden Rauch. Zwei Ladungen pro Fahrzeugleben, vier Sekunden Abstand zwischen Auslösungen. Rauch unterbricht die direkte Sicht für Bots und Gegner-Markierungen, stoppt aber keine Geschosse. Wiedereinstieg und neue Runden erneuern Module und Ladungen.
- Separates Training über „Erst üben“: fünf stationäre Ziele, keine Gegnerangriffe und kein Zeitlimit.
- Minikarte, Tempo, Nachladeanzeige, synthetischer Motor- und Geschützsound.
- Pause, Neustart und lokal gespeicherte Einstellungen für Maus, Sound, Kamerarückstoß und Grafikstufe (Hoch: weiche Schatten 2048 px; Mittel: 1024 px und geringere Auflösung; Niedrig: ohne Schatten). Touch-Geräte starten mit „Mittel“.
- Treffermarker am Fadenkreuz und Funken am Einschlag; Kettenklappern und Motorlast im Klang.
- Ergebnisbildschirm mit Schlüsselmoment (bester Abschuss, bevorzugt einer, der Punkt A entlastet hat, oder eine Eroberung im Alleingang) und einem Tipp.
- Einstellungen zusätzlich: Y-Achse umkehren und Bildratenanzeige.
- Einsatzbesprechung: Beim ersten Gefecht erklärt eine Karte Steuerung und Ziel; im Pausenmenü lässt sie sich über „Steuerung anzeigen“ erneut öffnen.
- Nach dem eigenen Ausfall zeigt die Wiedereinstiegsanzeige, wer dich womit und wo getroffen hat.
- Dauerhaftes Fahrerprofil mit Erfahrung, fünf Rängen, Gesamtstatistik und vier Tarnungen. Beide Panzer sind unabhängig vom Rang sofort verfügbar.

WASD oder Pfeiltasten fahren, Maus zielt, linke Maustaste feuert, rechte Maustaste zoomt, Leertaste bremst, Q legt Rauch, R halten repariert und Esc pausiert. Das orange kleine Fadenkreuz zeigt die tatsächliche Rohrrichtung, der weiße Kreis die Zielvorgabe. Über „Runde verlassen · Zur Garage“ im Pausenmenü kann eine laufende Runde beendet und das Fahrzeug gewechselt werden.

Starten und Weiterfahren fordern echte Pointer-Lock-Mausbindung an. Der Mauszeiger verschwindet, relative Mausbewegungen steuern das mittige Fadenkreuz. Esc löst die Mausbindung und pausiert; Fokusverlust pausiert ebenfalls. Verweigert eine eingebettete Vorschau die Bindung oder antwortet nicht, startet nach spätestens 1,2 Sekunden die ausdrücklich angezeigte Vorschausteuerung: Der Cursor bleibt über dem Gelände verborgen, die Maus zielt und am Bildrand dreht die Sicht weiter. Das ist keine echte Mausbindung; der Browser begrenzt weiterhin den unsichtbaren Zeiger. Weiterfahren funktioniert in diesem Modus ohne erneute Sperranfrage. Im Pausenmenü lassen sich echte Mausbindung erneut versuchen oder ein separates Browserfenster öffnen.

Touch-Steuerung (Querformat): Eine Ebene über dem Spielfeld verfolgt alle Finger. Links setzt der Daumen einen analogen Joystick (Vorwärts/Rückwärts und Lenken), rechts dreht Wischen Turm und Blick. Knöpfe: FEUER (weiterwischen zielt nach, der Ring zeigt das Nachladen), ZOOM (an/aus), RAUCH, REPARATUR (halten) und BREMSE. Das Spiel schaltet bei der ersten Berührung auf Touch um und bei einem Mausklick in der Garage zurück. Im Hochformat erscheint ein Hinweis zum Drehen.

Der Prototyp braucht WebGL. Noch nicht enthalten: geometrisch genaue Panzerungsdurchdringung mit inneren Komponenten, Besatzungen, Brände oder Multiplayer. Modulschaden wird durch vereinfachte lokale Trefferzonen bestimmt. Beide Karten haben ebene Fahrflächen; die äußeren Steinbruchterrassen sind Kulisse. Einstellungen und abgeschlossener Karrierefortschritt bleiben lokal erhalten; eine laufende Runde wird beim Neuladen zurückgesetzt.

## Erfahrung, Tarnungen und Spielstände

Nur abgeschlossene Vorherrschafts-Gefechte vergeben Erfahrung: 100 EP für die Teilnahme, zusätzlich 200 bei Sieg oder 100 bei Unentschieden, 75 je Abschuss, 10 je wirksamem Treffer und 3 je voller Sekunde am Ziel (höchstens 600 EP Zielbeitrag). Training, Verlassen und Neustarten einer laufenden Runde vergeben keine EP. Eine Gefechtskennung verhindert doppelte Verbuchung; die letzten 64 Kennungen werden gespeichert.

Ränge: Rekrut ab 0 EP, Fahrer ab 500, Frontkämpfer ab 1.200, Veteran ab 2.200 und Panzer-Ass ab 3.500. Tarnungen: Dienstoliv sofort, Wüstensand ab 500, Waldtarn ab 1.200 und Wintertarn ab 2.200 EP. Lackierungen werden pro Fahrzeug ausgewählt und verändern keine Kampfwerte. Die Muster sind prozedural erzeugt und benötigen keine externen Bilddateien.

„Profil & Tarnungen“ in der Garage zeigt Statistik, Rangfortschritt, Tarnungen und Sicherungsfunktionen. Export lädt eine JSON-Datei herunter. Import prüft Format, Zahlen, Statistik und Freischaltungen, zeigt eine Vorschau und ersetzt den bisherigen Karriere-Spielstand erst nach „Spielstand ersetzen“. Abbrechen oder ungültige Dateien ändern den bestehenden Fortschritt nicht. Einstellungen und die laufende Fahrzeugauswahl sind getrennt vom Karriere-Export.

Der Karriere-Spielstand liegt unter `iron-horizon-career-v1` im lokalen Browser-Speicher. Bei gesperrtem Speicher bleibt neuer Fortschritt in der Sitzung exportierbar. Beschädigte gespeicherte Daten werden nicht automatisch überschrieben; die Oberfläche meldet die Einschränkung. Für Wechsel zwischen Browsern oder Geräten den Spielstand exportieren und am Ziel importieren. Gleichzeitige Schreibzugriffe mehrerer Tabs werden über Web Locks koordiniert, wenn der Browser diese unterstützt.

## Dateien

- `index.html`, `style.css`, `battle.css`, `hud.css`: Startbildschirm, HUD, Touch-Knöpfe, Einsatzbesprechung, Pause und Ergebnis.
- `game.js`: Szene, Fahrzeuge, Maus- und Touch-Eingabe, Bots, Geschosse und Wiedereinstieg. `window.ironHorizon.sim(sekunden)` rechnet für Tests Spielzeit vor, `getState()` liefert den Zustand, `balance({ vehicles, map, level, seed })` spielt in der Garage ein ganzes Gefecht nur mit Bots (Spielerpanzer per Autopilot, ohne Erfahrung) und liefert Ergebnis und Abschussliste.
- `battle.js`: deterministische Rundenregeln, A*-Wegsuche mit Glättung und Bot-Taktik.
- `maps.js`, `terrain.js`: Kartendaten (Starts, Ziel, Überwachungsstellungen, Flanken), Deckung und statische 3D-Geometrie. Ein Kartenwechsel gibt die alte Geometrie frei.
- `systems.js`: Fahrzeugprofile, Module, Reparatur, Abpraller, Schaden, Streuung und Rauch-Sichtprüfung.
- `career.js`, `career.css`: Fortschritt, Spielstandprüfung, lokale Speicherung und Profiloberfläche.
- `vendor/three.min.js`: bestehende lokale Three.js-Version aus dem Projekt Löwen-Kart, mit MIT-Lizenz in `vendor/LICENSE-three.txt`.
- `serve.cjs`: startet `../server.js` für die Browser-Tests auf `127.0.0.1:4177`.

Die Bricolage-Schrift wird aus `../fonts/` geladen. Das Gesamtkonzept steht in `../IRON-HORIZON-KONZEPT.md`.

## Browser-Prüfung

`node --test iron-horizon/maps.test.cjs` prüft freie Start-, Ziel-, Überwachungs- und Flankenpositionen, befahrbare Bot-Wege auf beiden Karten und die seitlichen Zufahrten im Steinbruch.

`node iron-horizon/maps-browser-test.cjs` prüft Kartenwahl und Speicherung, Freigabe alter Geometrie, Laptop-Layout, Trainingstreffer, Pause/Fortsetzen, Bot-Ankunft am Punkt A und den Wechsel zurück zum Grenzposten. Benötigt denselben lokalen Server und dieselbe Playwright-/Chrome-Umgebung wie die folgenden Browser-Tests.

`node --test iron-horizon/battle.test.cjs` prüft Eroberung, Neutralisierung, Ticketabzug, Rundenende, Wegsuche, Wegglättung und die Bot-Taktik ohne weitere Pakete.

`node --test iron-horizon/systems.test.cjs` prüft Fahrzeugunterschiede, Modultreffer einschließlich Turmantrieb, Reparaturabbrüche, Abpraller, Schaden, Streuung, Rauchvorrat und Rauch-Sichtlinien.

`node --test iron-horizon/career.test.cjs` prüft EP, Statistik, doppelte Gefechtsbuchungen, Freischaltungen, Importvalidierung und ausgefallenen/fehlerhaften lokalen Speicher.

Bei laufendem Vorschau-Server kann `node iron-horizon/smoke-test.cjs` gestartet werden, wenn Playwright über die lokale Node-Umgebung verfügbar und Chrome installiert ist. Der Test prüft echte Mausbindung und Ablehnung, Treffer, Nachladesperre, Fahren, Bremsen, getrennte Turmdrehung, Pause, Neustart, Hinderniskollision, gespeicherte Einstellungen, Bot-Bewegung, Bot-Kampf, die Weiterleitung der Startseite, die Datenschutzseite und dass Testdateien nicht ausgeliefert werden. Screenshots werden in einem neuen temporären Ordner gespeichert.

`node iron-horizon/lifecycle-test.cjs` prüft zusätzlich den Spielerverlust durch echte Bot-Treffer, Wiedereinstieg und die Ergebnis-/Neustart-Oberfläche. Nur für die Ergebnisprüfung verkürzt der Test die Runde in seiner eigenen Browserantwort auf eine Sekunde; die gespeicherten Spieldateien bleiben dabei unverändert.

`node iron-horizon/pointer-test.cjs` prüft verweigerte, fehlende, nicht antwortende und ereignisbasiert abgelehnte Mausbindung sowie mehrfaches Weiterfahren, Vorschau-Zielen und -Schießen und normale Pointer-Lock-Fortsetzung.

`node iron-horizon/systems-browser-test.cjs` prüft Keiler-Auswahl und -Fahrverhalten, Rauchverbrauch und -Sichtblockade, Garagenwechsel und tatsächliche Reparatursteuerung. Für den Reparaturteil erhält nur die Browserantwort testweise beschädigte Startmodule; die gespeicherten Spieldateien werden nicht verändert.

`node iron-horizon/balance-tournament.cjs [--rounds 40] [--level veteran]` spielt vier Aufstellungen auf beiden Karten durch und prüft die Balance-Regel aus dem Konzept (Seiten 45–55 %, Luchs gegen Keiler höchstens 55 % der Abschüsse).

`node iron-horizon/touch-browser-test.cjs` emuliert ein Handy im Querformat und prüft Touch-Erkennung, Grafikstufe „Mittel“, die kompakte Garage, Einsatzbesprechung, Joystick-Fahren und -Lenken, Wisch-Zielen, FEUER, ZOOM, RAUCH, Pause über dem Touch-Feld und den Hochformat-Hinweis.

`node iron-horizon/career-browser-test.cjs` prüft kurze Testgefechte mit EP-Vergabe, Speicherung nach Neuladen, Tarnungen, echten JSON-Download und Import einschließlich Vorschau und Abbruch. Nur die Browserantwort der Rundenregeln wird für diese Prüfung verkürzt.
