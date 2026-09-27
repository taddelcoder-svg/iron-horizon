# Iron Horizon – Spielkonzept

Stand: 27. September 2026 · Konzept 2.0 · Spielstand: Version 1.0

Dieses Dokument beschreibt Iron Horizon in der fertigen Version 1.0: Ziele, Regeln, Fahrzeuge, Karten, Bots, Fortschritt, Technik, die gemessene Balance und was nach 1.0 kommen kann. Zahlen sind Spielwerte, keine historischen Daten.

**Legende:** ✅ in 1.0 umgesetzt · 💡 mögliche Ausbaustufe nach 1.0

## 1. Das Spiel in einem Satz

Ein direkt im Browser spielbares 3D-Panzerkampfspiel, in dem du durch geschicktes Fahren, Flankieren und gezielte Treffer kurze Gefechte gewinnst und nach und nach dein Fahrerprofil ausbaust.

Die Inspiration durch War Thunder liegt im Fahrzeuggefühl, im getrennten Bewegen von Wanne und Turm und in nachvollziehbaren Treffern. Eigene Fahrzeuge, Karten, Oberfläche und Modelle geben dem Spiel seine Identität.

## 2. Leitlinien

- **Schnell im Gefecht:** Vom Startbildschirm mit einem Klick in ein Gefecht mit Bots.
- **Spürbare Fahrzeuge:** Gewicht, Beschleunigung, Turmdrehung, Hangneigung und Rückstoß vermitteln das Gefühl einer Maschine.
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
| Hosting | ✅ Eigener kleiner Node-Server im Docker-Container auf Render (https://iron-horizon.onrender.com), gemeinsames Passwort, öffentliche Datenschutzseite, Eintrag in der Spielesammlung |
| Daten | ✅ Alles bleibt im Browser (`localStorage`); Export und Import als JSON-Datei |
| Spielerzahl | ✅ Einzelspieler gegen Bots · 💡 Online-Koop und Online-Gefechte |
| Ton | Bewusst keiner. Der synthetische Klang aus 0.6/0.7 wurde auf Wunsch vollständig entfernt. |
| Stil | Stilisierte, gut erkennbare 3D-Fahrzeuge in einer fiktiven, an frühe Panzertechnik angelehnten Welt. Keine Nationen, keine echten Fahrzeugnamen, keine Forschungsbäume. |

## 4. So verläuft eine Sitzung

1. Du öffnest das Spiel aus der Sammlung, gibst einmal das Passwort ein und siehst deinen Panzer in der Garage.
2. Du wählst Karte, Spielmodus, Gegnerstärke und Panzer. Der Dachs ist gesperrt, bis du Frontkämpfer bist; im Training darfst du ihn sofort fahren.
3. „Gefecht starten“ lädt die Karte mit dir und zwei verbündeten Bots gegen drei gegnerische Bots. Welche Panzer die Bots fahren, wird ausgelost, aber für beide Seiten gleich.
4. Beim ersten Mal erklärt eine Einsatzbesprechung Steuerung und Ziel, passend zu Maus oder Touch.
5. Du fährst über die Mitte oder eine Flanke zum Punkt. Im Flusstal gibt das Flussbett Deckung, der Hügelkamm Überblick.
6. Ein Treffer auf deine Kette hält dich auf. Das Schadensschema zeigt die Kette rot; du legst Rauch und reparierst.
7. Nach deinem Ausfall zeigt die Wiedereinstiegsanzeige, wer dich womit und wo getroffen hat.
8. Das Ergebnis zeigt Abschüsse, Treffer, Verluste, Zeit am Ziel, einen Schlüsselmoment mit Tipp, die Erfahrung und neue Auszeichnungen oder Tarnungen.

Die gewünschte Erfahrung: Du verstehst nach dem Gefecht, welche Entscheidung den Kampf verändert hat.

## 5. Spielmodi

### 5.1 Vorherrschaft ✅

| Regel | Wert |
| --- | --- |
| Teams | 3 gegen 3, ein menschlicher Spieler und fünf Bots |
| Ziel | Punkt A mit 17 m Radius |
| Rundenlimit | 7 Minuten |
| Teamtickets | Je 100 |
| Eroberung | 10 Sekunden allein im Kreis; mehrere Fahrzeuge beschleunigen nicht |
| Gegnerischer Punkt | Zuerst in 5 Sekunden neutralisieren, dann in 10 Sekunden erobern |
| Umkämpft | Beide Teams im Kreis: Eroberung und Ticketabzug ruhen |
| Gehaltener Punkt | Besitz bleibt beim Verlassen; der Gegner verliert alle 2 Sekunden ein Ticket |
| Fahrzeugverlust | Eigenes Team verliert 5 Tickets |
| Wiedereinstieg | Nach 6 Sekunden an der eigenen Basis, 3 Sekunden Startschutz, der beim eigenen Schuss endet |
| Sieg | Gegner hat 0 Tickets oder bei Zeitablauf weniger Tickets; Gleichstand = Unentschieden |

### 5.2 Durchbruch ✅

| Regel | Wert |
| --- | --- |
| Seiten | Der Spieler wählt Angriff oder Verteidigung; die Bots übernehmen den Rest |
| Punkte | Erst A in der Kartenmitte, dann B zwischen A und der Verteidigerbasis (im Steinbruch neben dem Felsriegel, nicht in seinem Schatten) |
| Tickets | Angreifer 100, Verteidiger unbegrenzt; jeder Verlust der Angreifer kostet 5 |
| Zeit | Start mit 5 Minuten, jeder eroberte Punkt bringt 3 Minuten |
| Eroberung | Mindestens doppelt so viele Angreifer wie Verteidiger im Kreis: allein 10 Sekunden, gegen Verteidiger 30 Sekunden. Sonst ruht der Fortschritt; ohne Angreifer im Kreis sinkt er langsam (20 Sekunden bis null) |
| Vorrücken | Nach der Eroberung von A steigen die Angreifer vor Punkt B wieder ein |
| Sieg | Angreifer: Punkt B erobert · Verteidiger: Zeit abgelaufen oder Angreifer ohne Tickets |

Die Verteidiger-Bots halten den aktiven Punkt mit einem Wächter im Kreis und zwei Überwachungsstellungen dahinter. Sobald die Angreifer Fortschritt machen, fahren alle in den Kreis. Positionen um Punkt B werden aus dem Punkt berechnet und automatisch aus Hindernissen geschoben, damit der Modus auf jeder Karte ohne Handarbeit funktioniert. Rot bekommt dabei exakt das Spiegelbild der blauen Positionen, sodass Angriff und Verteidigung für beide Seiten gleich schwer sind.

### 5.3 Training ✅

Testgelände auf der gewählten Karte: fünf stationäre Ziele, kein Gegenfeuer, kein Zeitlimit, keine Erfahrung. Hier lassen sich Fahrgefühl, Streuung, Abpraller und der Dachs gefahrlos ausprobieren.

### 5.4 Einsätze 💡

Kurze Solo-Aufgaben mit festen Zielen, zum Beispiel „Konvoi abfangen“, „Stellung halten“ oder „Aufklärung“. Bis zu drei Sterne je Einsatz; Grundlage einer späteren Kampagne.

## 6. Fahrzeuge

| Eigenschaft | Luchs – leichter Panzer | Keiler – mittlerer Panzer | Dachs – Jagdpanzer |
| --- | --- | --- | --- |
| Rolle | Flankieren, schnell zum Ziel | Stellung halten, Verbündete unterstützen | Aus der Distanz Wege sperren |
| Höchstgeschwindigkeit | 52 km/h (rückwärts 20) | 36 km/h (rückwärts 14) | 34 km/h (rückwärts 16) |
| Hauptwaffe | 40 mm | 75 mm | 88 mm |
| Nachladezeit | 3 s | 5 s | 6,5 s |
| Schadensfaktor | 1,0 | 1,45 | 1,9 |
| Frontschutz (Faktor frontal) | 1,0 | 0,7 | 0,59 |
| Turm | 1,15 rad/s | 0,7 rad/s | Kein Turm: Kanone schwenkt ±12° mit 0,9 rad/s; die Wanne dreht sich im Stand selbst zum Ziel |
| Streuung | Basis | +25 % | +10 % |
| Verfügbar | Immer | Immer | Training sofort, Gefecht ab Rang Frontkämpfer |
| Typischer Vorteil | Kommt um einen langsamen Gegner herum | Übersteht einen ungünstigen Frontalkontakt | Zwei Seitentreffer genügen; kleines Modulziel |
| Typischer Nachteil | Direkter Schlagabtausch ist riskant | Flankierende Gegner sind schwer abzufangen | Muss zum Zielen die ganze Wanne drehen |

Das Modell des Dachs ersetzt den Turm durch einen flachen Kasemattaufbau mit langem Rohr. Beim Dachs heißt das dritte Modul „Richtantrieb“ und sitzt nur an der Kanonenblende rund um das Rohr, etwa ein Zehntel der Front. So legt nicht jeder Treffer auf den großen Aufbau den Antrieb lahm.

### Balance

**Regeln** (geprüft mit `iron-horizon/balance-tournament.cjs`: sechs Bots, der Spielerpanzer fährt per Autopilot mit; alle drei Karten; Stufe Veteran):

1. In gespiegelten Aufstellungen gewinnt jede Seite 45–55 %.
2. Bei jedem Panzerpaar liegt keines bei mehr als 55 % der gegenseitigen Abschüsse.
3. Durchbruch: Die Angreifer gewinnen 40–60 %.
4. Richtwert: Reine Teams (nur X gegen nur Y) gewinnen je Karte höchstens 60 : 40.

**Ergebnis 1.0** (576 Gefechte, Stufe Veteran, je Aufstellung und Karte 16 Gefechte):

| Regel | Messung | Erfüllt |
| --- | --- | --- |
| 1. Seiten in gespiegelten Aufstellungen | Blau 54 % (144 Gefechte) | ✅ |
| 2. Abschüsse je Paar | Luchs : Keiler 50 %, Luchs : Dachs 52 %, Keiler : Dachs 49 % | ✅ |
| 3. Durchbruch | Angreifer 55 % (Grenzposten 50 %, Steinbruch 58 %, Flusstal 56 %) | ✅ |
| 4. Reine Teams höchstens 60 : 40 (Richtwert) | 2 von 9 Kombinationen | Richtwert |

48 Gefechte je Karte schwanken um etwa ±10 Prozentpunkte. In dieser Streuung liegt auch der Unterschied zwischen Blau und Rot als Angreifer: in diesem Lauf 47 % zu 62 %, im vorigen 50 % zu 49 %. Beide Seiten stehen exakt gespiegelt; mit sechs gleichen Panzern gewannen sie im Steinbruch als Angreifer gleich oft (93 % zu 90 %).

**Reine Teams** (letzter Lauf, je Paarung und Karte 32 Gefechte):

| Karte | Luchs : Keiler | Luchs : Dachs | Keiler : Dachs |
| --- | --- | --- | --- |
| Grenzposten | 59 : 41 | 75 : 25 | 22 : 78 |
| Steinbruch | 69 : 31 | 88 : 13 | 38 : 63 |
| Flusstal | 25 : 75 | 44 : 56 | 84 : 16 |

Jeder Panzer hat als Team eine Stärke: der Luchs auf Grenzposten und Steinbruch, der Keiler im Flusstal, der Dachs gegen Keiler auf Grenzposten und Steinbruch. Einzelne Zellen schwanken zwischen Läufen allerdings stark.

**Einordnung:** Reine Teams kommen im Spiel nicht vor. Die Bots losen gemischte, gespiegelte Paare aus, und der dritte rote Bot fährt immer deinen Panzer. In Eroberungsmodi gewinnt, wer den Punkt hält; kleine Unterschiede im Duell werden so zu großen Unterschieden im Ergebnis. Ein Beispiel: Beim Dachs hob eine Frontpanzerung von 0,55 statt 0,62 die reinen Teams von rund einem Viertel auf rund drei Viertel der Siege; 1.0 nutzt 0,59. Regel 4 bleibt deshalb ein Richtwert. Entscheidend ist, dass kein Panzer mehr überall unterlegen ist: Jeder hat eine Karte, auf der er als Team stark ist.

**Gefundene und behobene Ursachen:**

- Der Spielerstart lag 20 m näher am Punkt.
- Ziel-, Überwachungs- und Startpositionen waren nicht spiegelgleich.
- Auf dem Grenzposten fehlte Rot ein Haus als Gegenstück.
- Ein Verteidiger blockierte den Durchbruch dauerhaft.
- Der Autopilot-Spieler durfte nie Wächter sein.
- Das Wegraster der Bots lag nicht symmetrisch zu Punkt A, sodass Ziele für Blau und Rot verschieden einrasteten; an der Brücke im Flusstal kostete das Blau fast jedes Gefecht.
- Der baumfreie Streifen lag nicht spiegelgleich zu Punkt A.
- Bots hielten bis zu 4 m vor ihrem Ziel an, weil die Route in der Rasterzelle des Ziels endete. Liegt das Ziel genau auf einer Zellgrenze, rundete das Raster immer zur selben Seite: Im Steinbruch standen blaue Verteidiger an Punkt B deshalb weiter hinten, und Rot gewann als Angreifer 24 von 24 Gefechten. Jetzt fahren Bots exakt auf ihre Position.
- Der Steinbruch ist um 180° gedreht symmetrisch, war aber wie eine gespiegelte Karte belegt: Startplätze, Ziele und Durchbruch-Positionen passten nicht paarweise zueinander, und das Wegraster lief nicht durch Punkt A.
- Punkt B im Steinbruch lag im Schatten des Felsriegels; die Angreifer gewannen dort nur 6 %.
- Bäume am Kartenrand sowie Silos und Kran standen nur auf einer Seite.
- Die Richtantrieb-Zone des Dachs umfasste die halbe Frontplatte: 43 % aller Durchschläge legten ihn lahm, und Bots standen dann sechs Sekunden zum Reparieren. Jetzt ist sie auf die Kanonenblende beschränkt, und Bots reparieren einen Turm- oder Richtantrieb erst nach dem Kampf. Dachs-Bots reparieren seitdem 8 % statt 30 % ihrer Zeit.
- Die Gegnerstärke galt auch für die Verbündeten: Auf Rekrut kämpften deine Verbündeten ebenfalls wie Rekruten.
- Die Stufen wirkten verkehrt herum: Flanken im Wettlauf um den freien Punkt und der Rückzug der Asse beim Nachladen schwächten die Bots, sodass Rekruten 57 % gegen Veteranen gewannen (Abschnitt 10).

## 7. Steuerung und Kamera

| Aktion | Maus und Tastatur | Touch |
| --- | --- | --- |
| Fahren und Lenken | W / S, A / D oder Pfeiltasten | Analoger Joystick unter dem linken Daumen |
| Zielen | Maus (Pointer-Lock) | Rechts wischen |
| Feuern | Linke Maustaste | FEUER; weiterwischen zielt nach, der Ring zeigt das Nachladen |
| Zoom | Rechte Maustaste halten | ZOOM an/aus |
| Bremsen | Leertaste | BREMSE halten |
| Rauch | Q | RAUCH mit Ladungsanzeige |
| Reparieren | R halten, im Stillstand | REPARATUR halten |
| Pause | Esc | Pause-Knopf oben rechts |

Die Kamera folgt leicht erhöht hinter dem Panzer, weicht Häusern und Felsen aus und bleibt über dem Gelände. Das weiße Fadenkreuz zeigt die Zielvorgabe, der kleine orange Kreis die tatsächliche Rohrrichtung, ein gestrichelter Kreis die Streuung. Verweigert eine eingebettete Vorschau den Pointer-Lock, startet eine Ersatzsteuerung.

Einstellungen: Mausgeschwindigkeit, Rückstoß-Kamera, Grafikstufe (Hoch/Mittel/Niedrig; sinkt automatisch, siehe Abschnitt 13), Y-Achse umkehren, Bildratenanzeige. 💡 Getrennte Touch-Empfindlichkeit, Linkshänder-Anordnung.

## 8. Treffer und Schäden

- **Flugbahn:** 95 m/s, leichter Fall (3 m/s²). Geschosse treffen Gebäude, Felsen, Fahrzeuge und das Gelände. Rauch hält keine Geschosse auf.
- **Streuung:** im Stand etwa 2 mrad, in voller Fahrt bis etwa 18 mrad, Lenken erhöht sie weiter.
- **Abpraller:** flacher als 18° zur Fläche = kein Schaden.
- **Durchschlag:** Front 24, Seite 38, Heck 50 Strukturpunkte, mal Schadensfaktor des Schützen; frontal mal Frontschutz des Ziels. 100 Strukturpunkte je Fahrzeug.
- **Module:**

| Modul | Trefferzone | Auswirkung |
| --- | --- | --- |
| Kette | Niedrig außen an der Seite | Fahrzeug steht; der Treffer richtet nur 45 % Schaden an |
| Motor | Hinterer Wannenbereich | 40 % Antriebsleistung |
| Turmantrieb / Richtantrieb | Turmring bzw. beim Dachs die Kanonenblende | Turm oder Kanone schwenkt mit 35 % Tempo |

- **Reparatur:** 6 Sekunden Stillstand ohne Schuss; alle Module, keine Struktur. Bots reparieren Kette und Motor sofort, einen beschädigten Turm- oder Richtantrieb erst, wenn kein Gegner mehr zu sehen ist; er verlangsamt ja nur das Zielen.
- **Rauch:** 10 Sekunden, zwei Ladungen pro Leben.
- **Rückmeldung:** Treffermarker am Fadenkreuz, Funken, Meldungen („Abpraller“, „Durchschlag · Seite · −38“, Modul, „Ausgeschaltet“), Schadensschema, Ursache beim eigenen Ausfall.
- 💡 **Komponentenmodell** mit Besatzung, Munitionslager und Bränden, erst wenn eine Kampagne es braucht.

## 9. Karten

**Gestaltungsregeln:**

- Nutzbare Fläche etwa 290 × 290 m.
- Drei erkennbare Wege zum Ziel.
- Beide Teams bekommen dasselbe Gelände: Grenzposten und Flusstal sind an Punkt A gespiegelt, der Steinbruch ist um 180° um Punkt A gedreht. Das gilt für Positionen, Punkt B, Hindernisse, Bäume, Deko und das Wegraster der Bots.
- Basen außerhalb der Sichtlinie des Ziels, große Landmarken, sichtbare Kartengrenze.

Jede Karte hinterlegt Startplätze, Eroberungspositionen, Überwachungsstellungen, Flankenpunkte und für den Durchbruch einen Punkt B je Seite. Tests prüfen, dass alle frei und erreichbar sind.

| Karte | Charakter |
| --- | --- |
| 01 · Grenzposten | Dorf mit Häusern und Mauern, Hauptstraße in der Mitte, offene Wiesenflanken, Wald am Rand. Gespiegeltes Haus als Deckung für Rot. |
| 02 · Steinbruch | Felsriegel sperren die Mitte, zwei seitliche Zufahrten, Silos und Kran als Landmarken auf beiden Seiten |
| 03 · Flusstal | Höhengelände: Hügelkamm im Osten (bis gut 6 m) mit erhöhten Feuerstellungen, trockenes Flussbett im Westen (3 m tief) als geschützte Flanke, flacher Bach quer durch die Mitte mit Steinbrücke unter Punkt A |

**Höhengelände:**

- Die Höhe kommt aus einer mathematischen Funktion. Sie ist spiegelsymmetrisch zu Punkt A und an Startplätzen, Brücke und Punkt B flach; die steilste Stelle hat eine Steigung von 0,42.
- Fahrzeuge neigen sich mit dem Hang. Bergauf kostet es bis zu 55 % Tempo, bergab gibt es bis zu 15 % mehr.
- Sichtlinien, Zielpunkt, Geschosse und Kamera beachten die Geländehöhe; die Bots zielen im geneigten Turmsystem.
- Die Minikarte zeigt das Relief. Gebäude sind unzerstörbar.

## 10. Bots

- Wegsuche mit A* in acht Richtungen über ein 6-m-Raster, das genau durch Punkt A läuft; geglättet und bis exakt auf die Zielposition. Festgefahrene Bots setzen zurück und suchen neu.
- Taktik nach Lage am Punkt: erobern, ein Wächter im gesicherten Kreis, Überwachungsstellungen, Rückzug unter 35 Strukturpunkten, Rauch unter 60. Luchse flankieren oft, aber nur gegen einen gehaltenen Punkt; im Wettlauf um einen freien Punkt fahren alle direkt.
- In Stellung drehen sie die Front zur Bedrohung. Keiler und Dachs halten zum Schießen kurz an; der Dachs hält schon 2,5 Sekunden vor Ende des Nachladens, weil er erst die Wanne drehen muss.
- Sicht nur ohne Hindernis, Rauch und Gelände dazwischen, bis 115 m; nach Sichtverlust drei Sekunden auf die letzte Position.

Die gewählte Gegnerstärke gilt nur für die gegnerischen Bots. Die beiden Verbündeten kämpfen immer auf Stufe Veteran, damit „Rekrut“ wirklich leichter und „Ass“ wirklich schwerer wird.

| Stufe | Reaktionszeit | Zusätzlicher Zielfehler | Nachladen über dem Panzerwert | Taktik |
| --- | --- | --- | --- | --- |
| Rekrut | 1,2–1,8 s | 22 mrad | +1,4–2,4 s | Keine Flanken, kein Rauch |
| Veteran | 0,8–1,3 s | 11 mrad | +1–2 s | Flanken gegen einen gehaltenen Punkt, Rauch |
| Ass | 0,55–0,85 s | 7 mrad | +0,8–1,8 s | Wie Veteran; zielt zusätzlich tief auf Ketten und Seiten; +25 % Erfahrung |

**Was die Stufen bewirken** (je 72 Gefechte gegen ein Veteranen-Team, dazu `balance-tournament.cjs --beginner` mit je 96 Gefechten):

| Gegner | Bot-Team dieser Stufe gewinnt gegen Veteranen | Team mit Einsteiger gewinnt |
| --- | --- | --- |
| Rekrut | 21 % | 65 % |
| Veteran | 47 % | 29 % |
| Ass | 72 % | 17 % |

„Einsteiger“ heißt hier: Der Spielerpanzer fährt als Bot auf Rekrut-Niveau, die beiden Verbündeten als Veteranen. Ein echter Anfänger spielt anders als ein Bot, aber die Richtung stimmt: Rekrut ist für Einsteiger gut gewinnbar, Ass ist eine echte Herausforderung.

Vorher unterschieden sich die Stufen fast nur im Zielfehler und in der Reaktionszeit. Beides ändert im Nahkampf um den Punkt kaum etwas; die Abschüsse blieben bei 50 : 50. Dafür schadeten die „klügeren“ Taktiken: Flanken im Wettlauf um den freien Punkt und der Rückzug der Asse beim Nachladen holten die Bots vom Punkt weg. Rekruten gewannen so 57 % gegen Veteranen. Jetzt trennt vor allem die Nachladezeit die Stufen, und beide Taktiken schaden nicht mehr.

## 11. Garage und Fortschritt

**Erfahrung:** Nur abgeschlossene Gefechte zählen:

- 100 für die Teilnahme, 200 für einen Sieg oder 100 für ein Unentschieden.
- 75 je Abschuss, 10 je Treffer, 3 je Sekunde am Ziel (höchstens 600).
- Auf Stufe Ass kommen 25 % dazu.

**Ränge:** Rekrut 0, Fahrer 500, Frontkämpfer 1.200 (schaltet den Dachs frei), Veteran 2.200, Panzer-Ass 3.500 EP.

**Tarnungen** (je Panzer, nur Optik): Dienstoliv, Wüstensand (500), Waldtarn (1.200), Wintertarn (2.200), Stadtgrau (3.500), Swimming Lions (Auszeichnung „Ass-Sieg“).

**Auszeichnungen:**

| Auszeichnung | Bedingung |
| --- | --- |
| Erster Sieg | Ein Gefecht gewinnen |
| Dreifach | Drei Abschüsse in einem Gefecht |
| Alleingang | Einen Punkt ganz allein erobern |
| Dickes Fell | Zehn Abpraller an der eigenen Panzerung, über alle Gefechte |
| Schrauber | Fertig reparieren, während ein Gegner auf dich zielt |
| Unversehrt | Ein Gefecht ohne eigenen Verlust gewinnen |
| Ortskundig | Auf allen drei Karten gewinnen |
| Ass-Sieg | Gegen Ass-Gegner gewinnen |

Das Profil zeigt Statistik, Rangfortschritt, Tarnungen und Auszeichnungen. Export und Import prüfen den Spielstand; Spielstände aus 0.5–0.7 bleiben ladbar.

Keine Reparaturkosten, kein Teilnahmezwang, keine bezahlten Vorteile.

## 12. Darstellung und Oberfläche

- **Grafik:** Stilisiert, mit klaren Silhouetten, gedeckten Geländefarben, Tageslicht, Schatten und Nebel. Die Grafikstufen ändern Schatten und Auflösung; Touch-Geräte starten mit „Mittel“, und zu langsame Geräte stufen sich selbst herunter.
- **HUD:**
  - Oben stehen Tickets (∞ für Verteidiger) und Restzeit.
  - Links: Ziel, Fahrzeugzustand und Schadensschema. Unten: Nachladen und Ausrüstung. Rechts: die Minikarte mit Relief und den Punkten A/B.
  - Gegner werden erst bei Sichtkontakt markiert. Rufnamen und die Symbole ◆/◇ unterscheiden Freund und Feind zusätzlich zur Farbe.
- **Touch:** Das HUD rückt in die Ecken; im Hochformat erscheint ein Hinweis zum Drehen.
- **Ergebnis:** Schlüsselmoment (zum Beispiel „Dein Treffer ins Heck von Gegner 1 (Keiler) aus 64 m hat Punkt A entlastet“) und ein Tipp.

## 13. Technik

| Bereich | Umsetzung |
| --- | --- |
| Darstellung | Three.js r128, lokal mitgeliefert, klassische Skripte ohne Build-Schritt |
| Regeln | `battle.js` (Vorherrschaft, Durchbruch, Wegsuche, Taktik, Schlüsselmoment), `systems.js` (Fahrzeuge, Module, Schaden), `maps.js` (Karten, Höhenfunktion), `career.js` (Fortschritt, Auszeichnungen): reine Logik, in Node testbar |
| Spielschleife | `game.js` mit festem Simulationsschritt von 1/60 s; `window.ironHorizon.sim()`, `getState()`, `balance()` und `sampleFrames()` für Tests |
| Server | `server.js` liefert nur freigegebene Spieldateien, `zugang.js` schützt mit Passwort, `/datenschutz` und `/healthz` sind offen |
| Betrieb | Docker-Image auf Render, keine Datenbank, keine Spielerdaten auf dem Server |
| Tests | 53 Node-Tests, acht Playwright-Browsertests (Maus, Touch, Karten, Lebenszyklus, Module, Fortschritt, Modi) und das Balance-Turnier mit Einsteiger-Messung |

**Leistungsziel:** 60 Bilder pro Sekunde auf einem aktuellen Laptop mit Grafikstufe Hoch, mindestens 30 auf einem Mittelklasse-Handy mit Mittel.

**Automatische Grafikstufe:** Liegt die Bildrate im Gefecht vier Sekunden lang unter 35, senkt das Spiel die Grafikstufe um eins (höchstens alle 8 Sekunden, nie wieder hoch), meldet das kurz und merkt sich die neue Stufe. Wer mag, stellt sie im Pausenmenü zurück. Die Bildratenanzeige im Pausenmenü zeigt die echten Werte; Messungen von echten Handys stehen noch aus.

## 14. Datenschutz und Sicherheit

- **Zugang:** Gemeinsames Passwort mit technisch notwendigem Cookie; Fehlversuche pro IP sind begrenzt.
- **Datenschutzseite:** nennt Matteo Kohler als Verantwortlichen und beschreibt alle Browser-Speicher.
- **Keine fremden Dienste:** keine CDNs und keine Schriften oder Bibliotheken von außen.
- **Server:** Er liefert keine Tests, keine Serverdateien und keine versteckten Dateien aus.

## 15. Versionen

| Version | Inhalt |
| --- | --- |
| 0.5 | Zwei Karten, zwei Panzer, Vorherrschaft, Training, Fortschritt |
| 0.6 | Bot-Taktik, Abpraller, Turmantrieb, Streuung, Schadensschema, Touch-Steuerung, Grafikstufen, Einsatzbesprechung, Server mit Passwort und Datenschutz |
| 0.7 | Schwierigkeitsstufen, Treffermarker und Funken, Y-Achse umkehren, Bildratenanzeige, Schlüsselmoment, Balance-Turnier, spiegelgleiche Karten |
| 1.0 | Ton entfernt, Dachs (Jagdpanzer) mit Freischaltung, Modus Durchbruch mit Punkt B auf allen Karten, Karte Flusstal mit Höhengelände, ausgeloste gespiegelte Bot-Aufstellungen, acht Auszeichnungen, zwei neue Tarnungen, erweitertes Balance-Turnier; exakt gleiche Bedingungen für beide Seiten, Gegnerstärke nur für die Gegner, automatische Grafikstufe |

**1.0 ist fertig, wenn:**

- Alle Node- und Browser-Tests grün sind. ✅
- Die Balance-Regeln 1–3 erfüllt sind (siehe Abschnitt 6). ✅
- Das Spiel läuft passwortgeschützt auf Render und steht in der Sammlung. ✅
- Rekrut ist für Einsteiger gewinnbar (Messung in Abschnitt 10). ✅
- Zu langsame Geräte stufen die Grafik selbst herunter. ✅ Wie gut es sich auf echten Handys anfühlt, zeigt erst ein Spieltest mit der Familie.

## 16. Mögliche Ausbaustufen 💡

- **Kampagne:** fünf verbundene Einsätze mit bleibendem Fahrzeugzustand und Besatzungserfahrung.
- **Online-Koop:** zwei bis drei Freunde gemeinsam gegen Bots, mit Raumcode wie bei Löwen-Kart und Weltreiche. Die Simulation läuft dann auf dem Server mit denselben Regeldateien.
- **Online-Gefechte:** Spieler gegen Spieler, aufgefüllt mit Bots.
- **Gamepad-Steuerung**, getrennte Touch-Empfindlichkeit, Linkshänder-Anordnung.
- **Weitere Karten** mit Höhengelände (die Höhenfunktion ist allgemein angelegt).

Flugzeuge, Schiffe, mehrere Realismusmodi, große Forschungsbäume und zerstörbare Karten gehören nicht zum Plan.

## 17. Entscheidungen

- **Dachs-Freischaltung:** ab Rang Frontkämpfer, im Training sofort. Umgesetzt nach dem Vorschlag aus Konzept 1.0.
- **Ton:** keiner. Der Klang war nicht gut genug und wurde vollständig entfernt.
- **Balance:** Regeln 1–3 sind erfüllt. Reine Teams bleiben ein Richtwert und zeigen den Charakter der Karten (Abschnitt 6).
- **Gegnerstärke:** gilt nur für die Gegner; deine Verbündeten kämpfen immer wie Veteranen.
- **Offen – Reihenfolge nach 1.0:** zuerst Online-Koop oder zuerst die Kampagne?
- **Offen – Name:** „Iron Horizon“ bleibt, oder ein deutscher Name wie bei den anderen Spielen der Sammlung (zum Beispiel „Stahlhorizont“)?

## 18. Spielekarte für die Sammlung

**Name:** Iron Horizon

**Beschreibung:** Panzergefecht in 3D: drei Karten, drei Panzer, Vorherrschaft oder Durchbruch gegen Bots – mit Deckung, Abprallern und Flanken. Mit Maus oder Touch.

**Tags:** Einzelspieler · 3D · Panzer

**Status:** Version 1.0, passwortgeschützt auf Render und in der Sammlung eingetragen.
