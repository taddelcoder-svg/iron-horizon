# Iron Horizon – Spielkonzept

Stand: 27. September 2026 · Konzept 1.0 · Spielstand: Prototyp 0.6

Dieses Dokument beschreibt Iron Horizon vollständig: was im Prototyp 0.6 bereits spielbar ist, wie jedes System funktionieren soll und in welcher Reihenfolge das Spiel bis zur Version 1.0 fertig wird. Zahlen sind Spielwerte, keine historischen Daten. Werte, die noch nicht umgesetzt sind, sind Startwerte für Spieltests.

**Legende:** ✅ umgesetzt in 0.6 · 🔜 geplant bis 1.0 · 💡 spätere Ausbaustufe

## 1. Das Spiel in einem Satz

Ein direkt im Browser spielbares 3D-Panzerkampfspiel, in dem du durch geschicktes Fahren, Flankieren und gezielte Treffer kurze Gefechte gewinnst und nach und nach deine eigene Fahrzeuggarage aufbaust.

Die Inspiration durch War Thunder liegt im Fahrzeuggefühl, im getrennten Bewegen von Wanne und Turm und in nachvollziehbaren Treffern. Eigene Fahrzeuge, Karten, Oberfläche, Modelle und Sounds geben dem Spiel seine Identität.

## 2. Leitlinien

- **Schnell im Gefecht:** Vom Startbildschirm mit einem Klick in ein Gefecht mit Bots.
- **Spürbare Fahrzeuge:** Gewicht, Beschleunigung, Turmdrehung und Rückstoß vermitteln das Gefühl einer Maschine.
- **Position schlägt Dauerfeuer:** Deckung, Seitenpanzerung, Winkel und Nachladepausen bestimmen das Duell. Wer steht, trifft besser.
- **Verständliche Schäden:** Der Spieler erkennt, warum ein Treffer wirkt und was am eigenen Fahrzeug ausfällt.
- **Kurze Sitzungen:** Ein Gefecht dauert ungefähr fünf bis acht Minuten.
- **Faire Sammlung:** Fahrzeuge bieten unterschiedliche Spielweisen; Freischaltungen sind keine pauschalen Stärke-Upgrades.
- **Überall spielbar:** Maus und Tastatur am Rechner, Touch auf Tablet und Handy im Querformat.

## 3. Zielgruppe, Plattform und Umfang

Iron Horizon gehört zur privaten Swimming-Lions-Spielesammlung für Familie und Freunde. Es ist nicht kommerziell, ohne Werbung, ohne Konto und ohne Tracking.

| Punkt | Festlegung |
| --- | --- |
| Plattform | Browser mit WebGL, keine Installation |
| Eingabe | ✅ Maus und Tastatur mit Pointer-Lock · ✅ Touch mit Joystick und Knöpfen (Querformat) · 💡 Gamepad |
| Hosting | ✅ Eigener kleiner Node-Server im Docker-Container auf Render, gemeinsames Passwort (`ZUGANG_PASSWORT`), öffentliche Datenschutzseite |
| Daten | ✅ Alles bleibt im Browser (`localStorage`); Export und Import als JSON-Datei |
| Spielerzahl | ✅ Einzelspieler gegen Bots · 💡 Online-Koop und Online-Gefechte |
| Stil | Stilisierte, gut erkennbare 3D-Fahrzeuge in einer fiktiven, an frühe Panzertechnik angelehnten Welt. Keine Nationen, keine echten Fahrzeugnamen, keine Forschungsbäume. |

## 4. So verläuft die erste Sitzung

1. ✅ Du öffnest das Spiel aus der Sammlung, gibst einmal das Passwort ein und siehst deinen Panzer in der Garage.
2. ✅ Du wählst Karte („Grenzposten“ oder „Steinbruch“) und Fahrzeug: den beweglichen „Luchs“ oder den robusteren „Keiler“. Beide sind sofort verfügbar.
3. ✅ „Gefecht starten“ lädt die Karte mit dir und zwei verbündeten Bots gegen drei gegnerische Bots. Wer erst üben will, nimmt „Erst üben · Testgelände öffnen“.
4. ✅ Eine Einsatzbesprechung erklärt beim ersten Mal Steuerung und Ziel, passend zu Maus oder Touch.
5. ✅ Du fährst über die Hauptstraße oder eine Flanke zum Punkt A. Ein schneller gegnerischer Luchs versucht, dich über die Seite zu überraschen.
6. ✅ Ein Treffer auf deine Kette hält dich auf. Das Schadensschema zeigt die Kette rot; du legst Rauch und reparierst, während der Turm weiter feuert.
7. ✅ Nach deinem Ausfall zeigt die Wiedereinstiegsanzeige, wer dich wo getroffen hat, zum Beispiel „Getroffen von Gegner 2 · Luchs · Seite“.
8. ✅ Das Ergebnis zeigt Abschüsse, wirksame Treffer, Verluste, Zeit am Ziel und die verdiente Erfahrung. Du kannst sofort erneut antreten.

Die gewünschte Erfahrung: Du verstehst nach dem Gefecht, welche Entscheidung den Kampf verändert hat.

## 5. Spielmodi

### 5.1 Vorherrschaft ✅

| Regel | Wert |
| --- | --- |
| Teams | 3 gegen 3, ein menschlicher Spieler und fünf Bots |
| Ziel | Ein zentraler Eroberungspunkt „A“ mit 17 m Radius |
| Rundenlimit | 7 Minuten |
| Teamtickets | Je 100 zu Beginn |
| Eroberung | 10 Sekunden alleinige Präsenz im Kreis; mehrere Fahrzeuge beschleunigen nicht |
| Gegnerischer Punkt | Zuerst in 5 Sekunden neutralisieren, dann in 10 Sekunden erobern |
| Umkämpft | Beide Teams im Kreis: Eroberung und Ticketabzug pausieren |
| Gehaltener Punkt | Besitz bleibt beim Verlassen; der Gegner verliert alle 2 Sekunden ein Ticket |
| Fahrzeugverlust | Eigenes Team verliert 5 Tickets |
| Wiedereinstieg | Nach 6 Sekunden an der eigenen Basis, 3 Sekunden Startschutz, der beim eigenen Schuss endet |
| Sieg | Gegner erreicht 0 Tickets oder hat bei Zeitablauf weniger Tickets; gleiche Tickets = Unentschieden |

Die Basen liegen außerhalb der direkten Sichtlinie des Ziels. Bleibt der Spieler untätig, kämpfen zwei blaue gegen drei rote Bots: In einem Testlauf mit 0.6 dauerte das rund fünf Minuten (mit 0.5 gut zwei, weil die Bots nur stur zum Punkt fuhren). Mit aktivem Spieler ist das Ergebnis offen.

### 5.2 Training ✅

Testgelände auf der gewählten Karte: fünf stationäre Ziele, kein Gegenfeuer, kein Zeitlimit, keine Erfahrung. Hier lassen sich Fahrgefühl, Streuung und Abpraller gefahrlos ausprobieren.

### 5.3 Durchbruch 🔜 (0.8)

Angriff und Verteidigung mit zwei Punkten nacheinander. Die Angreifer müssen zuerst Punkt A, dann Punkt B erobern. Jeder eroberte Punkt bringt 3 Minuten Zusatzzeit und verschiebt die Startplätze beider Teams nach vorn. Die Verteidiger gewinnen, wenn die Zeit abläuft oder die Angreifer keine Tickets mehr haben (Angreifer 120 Tickets, Verteidiger unbegrenzt). Der Spieler wählt vor dem Gefecht die Seite. Dieser Modus nutzt die vorhandenen Karten mit je einem zusätzlichen Punkt B.

### 5.4 Einsätze 💡

Kurze Solo-Aufgaben mit festen Zielen, zum Beispiel „Konvoi abfangen“ (drei fahrende Lastwagen vor Kartenende ausschalten), „Stellung halten“ (Punkt 4 Minuten gegen Wellen verteidigen) oder „Aufklärung“ (drei Markierungen unentdeckt erreichen). Einsätze bewerten mit bis zu drei Sternen und bilden später die Grundlage einer Kampagne.

## 6. Fahrzeuge

| Eigenschaft | Luchs – leichter Panzer ✅ | Keiler – mittlerer Panzer ✅ | Dachs – Jagdpanzer 🔜 (0.8) |
| --- | --- | --- | --- |
| Rolle | Flankieren, schnell zum Ziel | Stellung halten, Verbündete unterstützen | Aus der Distanz Wege sperren |
| Höchstgeschwindigkeit | 52 km/h (rückwärts 20 km/h) | 36 km/h (rückwärts 14 km/h) | 32 km/h (rückwärts 16 km/h) |
| Hauptwaffe | 40 mm | 75 mm | 88 mm |
| Nachladezeit | 3 s | 5 s | 6,5 s |
| Schadensfaktor | 1,0 | 1,45 | 1,8 |
| Frontschutz (Schadensfaktor frontal) | 1,0 | 0,7 | 0,55 |
| Turm | 1,15 rad/s | 0,7 rad/s | Kein Turm: Kanone schwenkt nur ±12° in der Wanne |
| Streuung | Basis | +25 % | +10 % |
| Typischer Vorteil | Kommt um einen langsamen Gegner herum | Übersteht einen ungünstigen Frontalkontakt | Zwei Treffer genügen meist; flache Silhouette |
| Typischer Nachteil | Direkter Schlagabtausch ist riskant | Flankierende Gegner sind schwer abzufangen | Muss zum Zielen die ganze Wanne drehen |

Kaliber und Geschwindigkeiten dienen der Gestaltung; eine historische Simulation ist nicht vorgesehen. Jedes Fahrzeug kann jedes andere mit guten Treffern besiegen. Es gibt eine panzerbrechende Munitionsart und zwei Rauchladungen pro Fahrzeugleben.

**Balanceregel:** Werden Werte geändert, spielen die Bots vorher ein Rundenturnier ohne Spieler (6 Bots, beide Karten, je Fahrzeugmischung mindestens 40 Gefechte). Kein Fahrzeug darf dabei in mehr als 55 % seiner Duelle vorn liegen; blaue und rote Seite müssen jeweils zwischen 45 und 55 % gewinnen.

## 7. Steuerung und Kamera

| Aktion | Maus und Tastatur ✅ | Touch ✅ |
| --- | --- | --- |
| Fahren und Lenken | W / S, A / D oder Pfeiltasten | Analoger Joystick unter dem linken Daumen (erscheint dort, wo er aufsetzt) |
| Zielen | Maus (Pointer-Lock) | Rechts wischen |
| Feuern | Linke Maustaste | FEUER-Knopf; weiterwischen zielt nach, der Ring zeigt das Nachladen |
| Zoom | Rechte Maustaste halten | ZOOM-Knopf an/aus |
| Bremsen | Leertaste | BREMSE halten |
| Rauch | Q | RAUCH-Knopf mit Ladungsanzeige |
| Reparieren | R halten, im Stillstand | REPARATUR halten, Ring zeigt den Fortschritt |
| Pause | Esc | Pause-Knopf oben rechts |

Die Kamera folgt leicht erhöht hinter dem Panzer und weicht Häusern und Felsen aus. Das weiße Fadenkreuz zeigt die Zielvorgabe, der kleine orange Kreis die tatsächliche Rohrrichtung: Ein langsamer Turm schießt erst nach seiner Drehung dorthin. Ein gestrichelter Kreis zeigt die aktuelle Streuung. Verweigert eine eingebettete Vorschau den Pointer-Lock, startet eine Ersatzsteuerung mit Zielen per Maus und Drehen am Bildrand.

Einstellungen ✅: Mausgeschwindigkeit, Ton, Rückstoß-Kamera, Grafikstufe. 🔜 Y-Achse umkehren, Touch-Empfindlichkeit getrennt von der Maus, Linkshänder-Anordnung der Touch-Knöpfe.

## 8. Treffer und Schäden

Jeder Treffer beantwortet drei Fragen: Welche Fläche wurde getroffen? Prallt das Geschoss unter diesem Winkel ab? Welches Bauteil liegt dahinter?

- ✅ **Flugbahn:** Geschosse fliegen mit 95 m/s, fallen leicht (3 m/s²) und werden von Gebäuden, Felsen und Fahrzeugen gestoppt. Rauch hält keine Geschosse auf.
- ✅ **Streuung:** im Stand etwa 2 mrad, in voller Fahrt bis etwa 18 mrad, Lenken erhöht sie weiter.
- ✅ **Abpraller:** Trifft das Geschoss eine Fläche flacher als 18° (mehr als 72° zur Flächennormalen), prallt es ohne Schaden ab. Schräg gestellte Panzer sind dadurch schwerer zu knacken.
- ✅ **Durchschlag:** Der Schaden hängt von der Trefferrichtung ab: Front 24, Seite 38, Heck 50 Strukturpunkte, mal Schadensfaktor des Schützen, frontal mal Frontschutz des Ziels. Jedes Fahrzeug hat 100 Strukturpunkte.
- ✅ **Module:**

| Modul | Trefferzone | Auswirkung bei Ausfall |
| --- | --- | --- |
| Kette | Niedrige Treffer außen an der Seite | Fahrzeug steht; der Treffer richtet nur 45 % Strukturschaden an |
| Motor | Hinterer Wannenbereich | Nur noch 40 % Antriebsleistung |
| Turmantrieb | Turmring zwischen Wanne und Turm | Turm dreht mit 35 % Tempo |

- ✅ **Reparatur:** 6 Sekunden ohne Bewegung und ohne eigenen Schuss; stellt alle Module wieder her, aber keine Struktur. Bewegung, Schuss, Loslassen oder ein neuer Treffer brechen ab.
- ✅ **Rauch:** 10 Sekunden, zwei Ladungen pro Leben, 4 Sekunden Abstand. Rauch nimmt Bots und Gegnermarkierungen die Sicht.
- ✅ **Rückmeldung:** Meldungen unterscheiden „Abpraller“, „Durchschlag · Front/Seite/Heck“, beschädigte Module und „Fahrzeug ausgeschaltet“. Abpraller klingen hell, Durchschläge dumpf. Ein Schadensschema neben der Geschwindigkeit zeigt ausgefallene Module in Rot.
- 🔜 **Treffermarker (0.7):** kurzes Symbol am Fadenkreuz (Abpraller, Durchschlag, Modul) und Funken am getroffenen Fahrzeug, damit Treffer auch ohne Lesen verständlich sind.
- 💡 **Komponentenmodell:** Besatzung, Munitionslager und Brände ersetzen später die vereinfachte Struktur, aber erst, wenn die Kampagne sie braucht.

## 9. Karten

**Gestaltungsregeln** für jede Karte: nutzbare Fläche etwa 290 × 290 m (kompakt genug für 3 gegen 3), drei erkennbare Wege zum Ziel (Mitte, zwei Flanken), gleiche Anfahrtszeit für beide Teams (höchstens 10 % Unterschied), Basen außerhalb der Sichtlinie des Ziels, große Landmarken für die Orientierung, sichtbare Kartengrenze. Jede Karte hinterlegt Startplätze, Eroberungspositionen, Überwachungsstellungen und Flankenpunkte für die Bots; Tests prüfen, dass alle frei und erreichbar sind.

| Karte | Stand | Charakter |
| --- | --- | --- |
| 01 · Grenzposten | ✅ | Dorf mit Häusern und Mauern, Hauptstraße in der Mitte, offene Wiesenflanken, Wald am Rand |
| 02 · Steinbruch | ✅ | Felsriegel sperren die Mitte, zwei seitliche Zufahrten, Silos und Kran als Landmarken |
| 03 · Flusstal | 🔜 (0.9) | Erste Karte mit Höhengelände: Hügelroute mit erhöhten Feuerstellungen, trockenes Flussbett als geschützte Flanke, Steinbrücke in der Mitte |

Grenzposten und Steinbruch sind eben. Das Flusstal braucht ein Höhenraster, auf dem Fahrzeuge kippen, Kamera und Geschosse die Geländehöhe beachten und die Bot-Wegsuche Steigungen kennt. Gebäude bleiben unzerstörbar.

## 10. Bots

✅ **Umgesetzt in 0.6:**

- Wegsuche mit A* in acht Richtungen über ein 6-m-Raster, anschließend geglättet; festgefahrene Bots setzen zurück und suchen einen neuen Weg um andere Fahrzeuge.
- Taktik nach Lage am Punkt: Ist Punkt A nicht sicher im eigenen Besitz, fahren alle zum Punkt. Schnelle Luchse nehmen dabei in etwa jedem zweiten Leben erst eine weite Flanke. Ist der Punkt gesichert, bleibt ein Wächter im Kreis, die anderen beziehen Überwachungsstellungen. Wird der Punkt angegriffen, kehren alle zurück.
- Bots mit weniger als 35 Strukturpunkten ziehen sich nach einem Treffer zurück; unter 60 legen sie manchmal Rauch.
- In Stellung drehen sie die Front zur Bedrohung, damit ihre Panzerung wirkt.
- Sicht nur ohne Hindernis und Rauch dazwischen, bis 115 m. Nach Sichtverlust zielen sie drei Sekunden auf die zuletzt gesehene Position.
- Reaktionszeit 0,8–1,3 Sekunden nach neuem Ziel, Zielfehler zusätzlich zur Fahrzeugstreuung. Der Keiler hält zum Schießen kurz an, der Luchs schießt aus der Fahrt.
- Beschädigte Module reparieren Bots im Stillstand. Eigene Fahrzeuge blockieren Schüsse, nehmen aber keinen Schaden.

🔜 **Schwierigkeitsstufen (0.7):**

| Stufe | Reaktionszeit | Zusätzlicher Zielfehler | Taktik |
| --- | --- | --- | --- |
| Rekrut | 1,2–1,8 s | 18 mrad | Keine Flanken, kein Rauch |
| Veteran (heute) | 0,8–1,3 s | 11 mrad | Wie in 0.6 |
| Ass | 0,5–0,8 s | 6 mrad | Zielt auf Seiten und Ketten, nutzt Deckung beim Nachladen |

Die Stufe wird in der Garage gewählt; Ass-Gefechte geben 25 % mehr Erfahrung.

## 11. Garage und Fortschritt

✅ **Umgesetzt:** Garage mit Fahrzeug, Rolle, drei Kennwerten, Kartenwahl und Tarnungen. Nur abgeschlossene Gefechte geben Erfahrung: 100 für die Teilnahme, 200 für einen Sieg oder 100 für ein Unentschieden, 75 je Abschuss, 10 je wirksamem Treffer und 3 je Sekunde am Ziel (höchstens 600). Fünf Ränge (Rekrut 0, Fahrer 500, Frontkämpfer 1.200, Veteran 2.200, Panzer-Ass 3.500 EP) und vier Tarnungen (Dienstoliv, Wüstensand ab 500, Waldtarn ab 1.200, Wintertarn ab 2.200 EP). Statistik, JSON-Export und -Import mit Prüfung.

🔜 **Bis 1.0:**

- Der Dachs ist im Training sofort fahrbar und ab Rang „Frontkämpfer“ im Gefecht. Das ist die einzige Fahrzeugfreischaltung; Luchs und Keiler bleiben immer verfügbar.
- Acht Auszeichnungen mit kleiner Plakette in der Garage: Erster Sieg, Drei Abschüsse in einem Gefecht, Punkt allein erobert, Zehn Abpraller kassiert, Reparatur unter Beschuss, Sieg ohne eigenen Verlust, Alle Karten gewonnen, Ass-Sieg.
- Tarnungen für den Dachs und zwei weitere Muster (Stadtgrau ab 3.500, „Swimming Lions“-Abzeichen für die Auszeichnung „Ass-Sieg“).

Keine Reparaturkosten, kein täglicher Teilnahmezwang, keine bezahlten Stärkevorteile. Dauerhafte Fahrzeugschäden und erfahrene Besatzungen gehören ausschließlich zur späteren Kampagne.

## 12. Darstellung, Sound und Oberfläche

✅ Stilisierte 3D-Grafik mit klaren Silhouetten, gedeckten Geländefarben, warmem Tageslicht, Schatten und Nebel. Grafikstufen Hoch, Mittel und Niedrig (ohne Schatten); Touch-Geräte starten mit Mittel. Synthetischer Motorsound nach Fahrt, kräftiger Schuss mit Rückstoß, eigene Klänge für Abpraller, Treffer und Rauch.

✅ HUD: oben Tickets und Restzeit, links Ziel und Fahrzeugzustand mit Schadensschema, unten Nachladen und Ausrüstung, rechts die Minikarte. Gegner werden erst bei Sichtkontakt markiert; Freund und Feind unterscheiden sich zusätzlich zur Farbe durch Symbole (◆/◇) und Rufnamen. Auf Touch-Geräten rückt das HUD in die Ecken und lässt Platz für die Daumen.

🔜 (0.7): Kettenklappern, Motorlast beim Anfahren, Einschlagfunken, Staubfahnen hinter schnellen Fahrzeugen, Ergebnisbildschirm mit „Schlüsselmoment“ (zum Beispiel „Dein Flankenschuss auf Gegner 3 hat Punkt A gerettet“).

## 13. Technik

| Bereich | Umsetzung |
| --- | --- |
| Darstellung | Three.js r128, lokal mitgeliefert, klassische Skripte ohne Build-Schritt |
| Regeln | `battle.js` (Runde, Wegsuche, Bot-Taktik), `systems.js` (Fahrzeuge, Module, Abpraller, Streuung, Rauch), `career.js` (Fortschritt), `maps.js` (Kartendaten): reine Logik, in Node testbar |
| Spielschleife | `game.js` mit festem Simulationsschritt von 1/60 s; `window.ironHorizon.sim(s)` rechnet für Tests vor |
| Server | `server.js` liefert nur freigegebene Spieldateien aus, `zugang.js` schützt mit Passwort, `/datenschutz` und `/healthz` sind offen |
| Betrieb | Docker-Image auf Render, keine Datenbank, keine Spielerdaten auf dem Server |
| Tests | 29 Node-Tests für Regeln, Taktik, Karten und Fortschritt; zusätzliche Playwright-Browsertests für Maus, Karten, Lebenszyklus und Fortschritt |

Leistungsziele: 60 Bilder pro Sekunde auf einem aktuellen Laptop mit Grafikstufe Hoch, mindestens 30 auf einem Mittelklasse-Handy mit Mittel. Diese Werte sind noch nicht gemessen; eine eingebaute Bildratenanzeige (🔜 0.7) soll das nachholen.

Für Online-Spiel 💡 wird die Simulation auf den Server verlegt, so wie bei Weltreiche: Der Server rechnet mit denselben Regeldateien, die Browser senden nur Eingaben und zeigen vorhergesagte Zwischenstände.

## 14. Datenschutz und Sicherheit

✅ Gemeinsames Passwort mit technisch notwendigem Cookie, begrenzte Fehlversuche pro IP, Datenschutzseite mit Matteo Kohler als Verantwortlichem, keine fremden Dienste, keine Schriften oder Bibliotheken von CDNs. Der Server liefert keine Tests, keine Quelltexte des Servers und keine versteckten Dateien aus.

## 15. Fahrplan bis 1.0

| Version | Inhalt | Fertig, wenn … |
| --- | --- | --- |
| 0.5 ✅ | Zwei Karten, zwei Panzer, Vorherrschaft, Training, Fortschritt | Runde endet zuverlässig, Fortschritt bleibt erhalten |
| 0.6 ✅ | Bot-Taktik, Abpraller, Turmantrieb, Streuung, Schadensschema, Touch-Steuerung, Grafikstufen, Einsatzbesprechung, Server mit Passwort und Datenschutz | Gefecht ist auf Handy und Rechner spielbar; ohne Spieler dauert es mehrere Minuten; Server liefert nur Spieldateien |
| 0.7 🔜 | Schwierigkeitsstufen, Treffermarker und Funken, Klangfeinschliff, Y-Achse umkehren, Bildratenanzeige, Ergebnis mit Schlüsselmoment, Balance-Turnier | Rekrut ist für Einsteiger gewinnbar, Ass fordert Erfahrene; Balance-Regel aus Abschnitt 6 erfüllt |
| 0.8 🔜 | Dachs (Jagdpanzer), Modus Durchbruch, Punkt B auf beiden Karten | Dachs besteht die Balance-Regel; Durchbruch endet zuverlässig für beide Seiten |
| 0.9 🔜 | Karte Flusstal mit Höhengelände | Fahrzeuge, Kamera, Geschosse und Bots kommen mit Steigungen zurecht; Anfahrtszeiten weichen höchstens 10 % ab |
| 1.0 🔜 | Auszeichnungen, neue Tarnungen, Feinschliff, Spielekarte in der Sammlung aktualisiert | Alle Tests grün, zehn Gefechte ohne Fehler auf Rechner und Handy |

## 16. Spätere Ausbaustufen 💡

- **Kampagne:** fünf verbundene Einsätze mit bleibendem Fahrzeugzustand und Besatzungserfahrung.
- **Online-Koop:** zwei bis drei Freunde gemeinsam gegen Bots, mit Raumcode wie bei Löwen-Kart und Weltreiche; verlassene Plätze übernimmt ein Bot.
- **Online-Gefechte:** Spieler gegen Spieler, aufgefüllt mit Bots.
- **Gamepad-Steuerung.**

Flugzeuge, Schiffe, mehrere Realismusmodi, große Forschungsbäume und vollständig zerstörbare Karten gehören ausdrücklich nicht zum Plan.

## 17. Offene Entscheidungen

1. **Dachs-Freischaltung:** ab Rang „Frontkämpfer“ (Vorschlag) oder sofort für alle?
2. **Reihenfolge nach 1.0:** zuerst Online-Koop mit Freunden oder zuerst die Kampagne?
3. **Name:** „Iron Horizon“ bleibt, oder bekommt das Spiel wie die anderen der Sammlung einen deutschen Namen (zum Beispiel „Stahlhorizont“)?

## 18. Spielekarte für die Sammlung

**Name:** Iron Horizon

**Beschreibung:** Panzergefecht in 3D: Mit zwei Verbündeten gegen drei Gegner um den Grenzposten oder den Steinbruch – mit Deckung, Abprallern und Flanken. Mit Maus oder Touch.

**Tags:** Einzelspieler · 3D · Panzer

**Status:** Prototyp 0.6, passwortgeschützt auf Render.
