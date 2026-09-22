"""Erzeugt supabase/002_seed.sql aus dem Planungsstand vom 22.09.2026.
python3 scripts/build_seed.py
"""
from pathlib import Path

def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, list):
        return "array[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"

def insert(table, cols, rows):
    out = [f"insert into {table} ({', '.join(cols)}) values"]
    vals = [" (" + ", ".join(q(r.get(c)) for c in cols) + ")" for r in rows]
    return "\n".join(out) + "\n" + ",\n".join(vals) + ";\n"

MI, DO, FR, SA, SO = '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'
DI = '2026-09-22'

# (area, title, contact, priority, due, status, answer)
T = [
 ('Rahmen','S&G-Angebot per Mail bestätigt?','Hanna Michel','hoch',DI,'erledigt','Bestätigt. 70 Essen fix, Reduzierung nicht mehr möglich.'),
 ('Rahmen','Sind die 70 Eingeladene oder Zusagen?','Sponsoring-Team','hoch',DI,'erledigt','Einladungen – es kommen voraussichtlich weniger. Essen bleibt bei 70.'),
 ('Rahmen','Frist für Zusagen der Sponsoren (für Tisch- und Sitzplan)','Sponsoring-Team','hoch',DO,'offen',''),
 ('Rahmen','Einlass 19:00 oder 19:15?','Vorstand','hoch',MI,'offen',''),
 ('Rahmen','Alle Schichten 30 Min vorziehen (wie Deep Tech Dinner)?','Student Reps','hoch',MI,'offen',''),
 ('Rahmen','Welcher Raum ist gebucht: großer Saal, D-006 oder beides?','Sara Rottenburg','hoch',MI,'offen',''),
 ('Rahmen','Hörsaal D-001 als Neben- und Pausenraum mitbuchbar?','Sara Rottenburg','mittel',MI,'offen',''),
 ('Rahmen','Budget für Licht, Deko, Blumen – Höhe und Abrechnungsweg','Vorstand','mittel',MI,'offen',''),
 ('Rahmen','Wer hat Samstag bei Uneinigkeit das letzte Wort?','Luis Wittbrock','mittel',MI,'offen',''),
 ('Rahmen','Versicherung über IdeaLab e.V. gedeckt?','Vorstand','niedrig',FR,'offen',''),
 ('Rahmen','GEMA bei der Musik ein Thema?','Vorstand','niedrig',FR,'offen',''),
 ('Material','Menüteller Ø 32 cm – wer stellt sie? Fehlen in jeder Bestellung','Hanna Michel','hoch',MI,'offen',''),
 ('Material','Besteck: wo lagert es, welche Teile, wie viele?','Paul Läufer','hoch',MI,'offen',''),
 ('Material','Wein-, Wasser- und Biergläser – woher?','Benedikt Friedrich','hoch',MI,'offen',''),
 ('Material','Bruchreserve über die 740 Teile hinaus','Kai (S&G)','mittel',MI,'offen',''),
 ('Material','Licht und Scheinwerfer reservieren (Konkurrenz Gala)','Technik','hoch',DI,'offen',''),
 ('Material','Musikanlage: vorhanden, welcher Anschluss?','Sara Rottenburg','mittel',MI,'offen',''),
 ('Material','Mikrofon für die Reden plus Ersatzbatterien','Sara Rottenburg','mittel',DO,'offen',''),
 ('Material','Kaffee: Maschine, 45 Tassen, Untertassen, Löffel, Milch, Zucker','Hanna Michel','hoch',MI,'offen',''),
 ('Material','Papiertischdecken vorhanden oder kaufen?','Paul Läufer','mittel',DO,'offen',''),
 ('Material','Stofftischdecken gemeinsam mit dem Nachbarteam','Nachbarteam','mittel',MI,'offen',''),
 ('Material','Holzblöcke für die Karten – wo liegen sie?','Paul Läufer','mittel',DO,'offen',''),
 ('Material','Blumen und kleine Vasen – Bestand oder Einkauf?','IdeaLab','niedrig',FR,'offen',''),
 ('Material','Offene Kerzen zulässig oder LED?','Sara Rottenburg','mittel',MI,'offen',''),
 ('Material','Karten: Sprache vereinheitlichen, Testdruck, Stückzahl','Luis Wittbrock','mittel',DO,'in Arbeit',''),
 ('Material','Tischnummern, Sitzplan-Aushang, Wegweiser','Marlon Osterod','mittel',FR,'offen',''),
 ('Material','Notfallkiste packen','Marlon Osterod','niedrig',FR,'offen',''),
 ('Anlieferung','S&G liefert Donnerstag 740 Teile – wer nimmt an, wo kommen sie hin?','Kai (S&G)','hoch',DO,'offen',''),
 ('Anlieferung','Lagerung der 740 Teile Do–Sa sicher?','Sara Rottenburg','mittel',DO,'offen',''),
 ('Anlieferung','Anlieferzeit von S&G am Samstag, je Gang','Kai (S&G)','hoch',MI,'offen',''),
 ('Anlieferung','Zufahrt frei? Burgplatz wird Sa 08:00–18:00 abgebaut','Sara Rottenburg','mittel',FR,'offen',''),
 ('Anlieferung','Fahrstuhl: Zugang, Schlüssel, Dauer pro Fahrt','Paul Läufer','mittel',FR,'offen',''),
 ('Anlieferung','Getränke erst Samstag abstellen – wo genau, wer behält sie im Blick?','Benedikt Friedrich','mittel',FR,'offen',''),
 ('Anlieferung','Wer holt das HfM-Material, womit, wann?','HfM','mittel',DO,'offen',''),
 ('Aufbau','Ab wann ist der Raum Samstag zugänglich, wer schließt auf?','Sara Rottenburg','hoch',MI,'offen',''),
 ('Aufbau','Zustand des Saals nach dem Deep Tech Dinner am Freitag','Sara Rottenburg','mittel',FR,'offen',''),
 ('Aufbau','Saalmaße, Tischanzahl, Tischmaße, Stuhlanzahl','Sara Rottenburg','hoch',MI,'offen',''),
 ('Aufbau','Tischvariante im Raumplan festlegen','Marlon Osterod','hoch',DO,'offen',''),
 ('Aufbau','Lichtschaltung vorher durchprobieren (Freitag vormittags)','Marlon Osterod','mittel',FR,'offen',''),
 ('Aufbau','Wo stehen Bar und Anrichtestraße? (Ausgabe bietet sich an)','Marlon Osterod','mittel',DO,'offen',''),
 ('Aufbau','Set-up-Lead benennen','Marlon Osterod','mittel',MI,'offen',''),
 ('Empfang','Welche Sponsoren kommen zu uns, welche zur Gala?','Sponsoring-Team','mittel',DO,'offen',''),
 ('Empfang','Wer empfängt am Eingang?','Sponsoring-Team','mittel',FR,'offen',''),
 ('Empfang','Tischkarten und Sitzplan','Sponsoring-Team','niedrig',FR,'entfällt','Keine Namensschilder, keine Namensliste – kein namentlicher Sitzplan.'),
 ('Empfang','Empfangsgetränk per Tablett – ja oder nein?','Luis Wittbrock','mittel',MI,'offen',''),
 ('Empfang','Garderobe: wo, betreut oder unbetreut?','Sara Rottenburg','niedrig',FR,'offen',''),
 ('Empfang','Dresscode für Gäste und Crew','Vorstand','mittel',MI,'offen',''),
 ('Essen & Service','Ab wann braucht S&G die 4 Anrichter? 19:15 ist zu spät','Kai (S&G)','hoch',MI,'offen',''),
 ('Essen & Service','Produktionshilfe Fr + Sa ab 09:00 (je 2 Pers.) besetzt?','Hanna Michel','hoch',MI,'offen',''),
 ('Essen & Service','Handynummer S&G-Ansprechpartner für Samstag','Kai (S&G)','mittel',FR,'offen',''),
 ('Essen & Service','Darf die Mensa-Küche genutzt werden, wer weist ein?','Sara Rottenburg','hoch',MI,'offen',''),
 ('Essen & Service','Hygienebelehrung § 43 IfSG für Küchencrew nötig?','Kai (S&G)','mittel',MI,'offen',''),
 ('Essen & Service','Vegane Option und Allergenliste','Kai (S&G)','niedrig',MI,'entfällt','Keine vegane Option – bewusste Entscheidung.'),
 ('Essen & Service','Teller vorwärmen möglich?','Kai (S&G)','niedrig',FR,'offen',''),
 ('Essen & Service','Brot vorab auf die Tische?','Kai (S&G)','niedrig',MI,'offen',''),
 ('Essen & Service','Drei Weinrundengeher aus der Service-Schicht benennen','Marlon Osterod','mittel',FR,'offen',''),
 ('Essen & Service','Service-Lead und Küchen-Lead benennen','Marlon Osterod','hoch',MI,'offen',''),
 ('Programm','Wer spricht, wann und wie lange?','Vorstand','mittel',MI,'offen',''),
 ('Programm','Mikro Freitag testen mit der Person, die Samstag spricht','Marlon Osterod','niedrig',FR,'offen',''),
 ('Programm','Jazz-Playlist, heruntergeladen, 4 h, verantwortliche Person','Luis Wittbrock','mittel',FR,'offen',''),
 ('Programm','Fotograf? Dann Einwilligung klären','Vorstand','niedrig',FR,'offen',''),
 ('Getränke','Bier: Fass oder Flasche? Karte verspricht Zapfhahn','Benedikt Friedrich','hoch',MI,'offen',''),
 ('Getränke','Welche Mengen sind reserviert, wo stehen sie?','Benedikt Friedrich','mittel',MI,'offen',''),
 ('Getränke','Kühlung: kein Kühlschrank in der Mensa','Benedikt Friedrich','mittel',FR,'offen',''),
 ('Getränke','Nachschubweg über Fahrstuhl – wer läuft?','Marlon Osterod','niedrig',FR,'offen',''),
 ('Getränke','Bar-Lead benennen','Marlon Osterod','mittel',MI,'offen',''),
 ('Ende & Abbau','Bus-Transfer 21:30 – gilt er für unsere Gäste?','Vorstand','mittel',MI,'offen',''),
 ('Ende & Abbau','Bar nach 21:30 – wer bedient, wenn Marc/Celina im Tear-down sind?','Marlon Osterod','mittel',FR,'offen',''),
 ('Ende & Abbau','Entsorgung der Essensreste über das Gala-Team','Gala-Team','mittel',FR,'offen',''),
 ('Ende & Abbau','Spülmaschine nutzbar? Wohin mit Geschirr danach?','Sara Rottenburg','mittel',FR,'offen',''),
 ('Ende & Abbau','Raumübergabe an Hausmeister mit Protokoll','Marlon Osterod','niedrig',SA,'offen',''),
 ('Ende & Abbau','Crew-Essen und Pause für die 5 mit Doppelschicht','Marlon Osterod','hoch',FR,'offen',''),
 ('Nachbereitung','Material zurück an HfM','Marlon Osterod','niedrig',SO,'offen',''),
 ('Nachbereitung','Belege sammeln und abrechnen','Luis Wittbrock','niedrig',SO,'offen',''),
 ('Nachbereitung','Debrief mit Luis und Abgabe an IdeaLab','Marlon Osterod','niedrig',SO,'offen',''),
 ('Nachbereitung','Dank an die 19 in den Gruppen','Marlon Osterod','niedrig',SO,'offen',''),
]
tasks = [dict(area=a, title=t, contact=c, priority=p, due=d, status=s, answer=an, sort=i) for i, (a, t, c, p, d, s, an) in enumerate(T)]

# (category, item, qty, source, when, status, notes)
M = [
 ('Essen','3-Gänge-Menü (Linsensalat · Maishähnchen/Planted · Panna Cotta)','70, davon 10 veg.','S&G Catering','Sa','geklärt','16,75 € netto p. P., ~1.395 € brutto'),
 ('Geschirr','Suppentasse + Unterteller','70 + Reserve','S&G (740er Lieferung)','Do','bestellt','Null Bruchreserve über 3 Abende'),
 ('Geschirr','Whiskyglas Tumbler 0,2 l (Dessert)','70 + Reserve','S&G (740er Lieferung)','Do','bestellt',''),
 ('Geschirr','Menüteller Ø 32 cm (Hauptgang)','77','ungeklärt','Fr','offen','Fehlt in jeder Bestellung'),
 ('Geschirr','Besteck (Vorspeise, Hauptgang, Dessertlöffel)','~390 Teile','HfM','Fr','offen',''),
 ('Gläser','Wein-, Wasser-, Biergläser','~242','ungeklärt','Fr','offen',''),
 ('Tisch','Stofftischdecken','1 je Tisch + 2','Nachbarteam','Fr','offen','Maße erst nach Saalmaßen'),
 ('Tisch','Papiertischdecken / Molton','nach Tischzahl','IdeaLab-Bestand oder Metro','Fr','offen',''),
 ('Tisch','Stoffservietten','80','ungeklärt','Fr','offen',''),
 ('Deko','Holzblöcke für Karten','1 je Tisch','IdeaLab-Bestand','Fr','offen','Paul: „richtig wichtig“ – suchen'),
 ('Deko','Blumen und kleine Vasen (max. 25 cm hoch)','1 je Tisch','Bestand oder Einkauf','Sa','offen',''),
 ('Deko','LED-Kerzen / Windlichter','2–3 je Tisch','Einkauf','Fr','offen','Brandschutz: offene Kerzen klären'),
 ('Deko','Lichterketten warmweiß','3–4','Einkauf / Bestand','Fr','offen',''),
 ('Druck','Menü- und Getränkekarten','~35','Druck (Luis)','Fr','angefragt','Testdruck vorher'),
 ('Druck','Tischnummern-Aufsteller','1 je Tisch','Druck','Fr','offen',''),
 ('Technik','Uplights / Scheinwerfer','6–10','Technik (Konkurrenz Gala)','Fr','offen','Heute reservieren'),
 ('Technik','Musikanlage + Kabel + Adapter','1','Mensa / Technik','Fr','offen',''),
 ('Technik','Mikrofon + Ersatzbatterien','1–2','Technik','Fr','offen',''),
 ('Getränke','Wein weiß / rot','~30–36 Fl.','Benedikt (zentral)','Sa','offen','Kommission anfragen'),
 ('Getränke','Wasser still / spritzig','~90 Fl.','Benedikt (zentral)','Sa','offen',''),
 ('Getränke','Bier','1–2 Kästen oder Fass','Benedikt (zentral)','Sa','offen','Karte verspricht „on tap“'),
 ('Getränke','Kaffee, Tassen, Milch, Zucker','~45 Tassen','ungeklärt','Sa','offen',''),
 ('Getränke','Eis, Eisboxen, Weinkühler','~5 kg Eis','Einkauf','Sa','offen','Kein Kühlschrank vor Ort'),
 ('Kleinkram','Korkenzieher / Kellnermesser','4','Einkauf','Sa','offen',''),
 ('Kleinkram','Flaschenöffner','3','Einkauf','Sa','offen',''),
 ('Kleinkram','Servierttücher','10','Bestand','Sa','offen',''),
 ('Kleinkram','Kehrblech, Besen, Müllbeutel, Leergutkisten','je 2','Mensa / Einkauf','Sa','offen',''),
 ('Kleinkram','Notfallkiste (Tape, Kabelbinder, Pflaster, Stifte, Ladekabel)','1','selbst packen','Sa','offen',''),
 ('Crew','Crew-Verpflegung (Brötchen / Reste) + Wasser','19 Pers.','ungeklärt','Sa','offen',''),
]
materials = [dict(category=c, item=it, quantity=qt, source=s, needed_when=w, status=st, notes=n, sort=i) for i, (c, it, qt, s, w, st, n) in enumerate(M)]

C = [
 ('Marlon Osterod','Organisation, Shift Manager aller 5 Schichten','IdeaLab (Anwärter)','Gesamtleitung'),
 ('Luis Wittbrock','Co-Organisator','IdeaLab (Anwärter)','Speise- und Getränkekarten'),
 ('Hanna Michel','IdeaLab e.V.','IdeaLab e.V.','Schnittstelle zu S&G, Bestellungen, Budget'),
 ('Kai (S&G)','Caterer','S&G Catering GmbH, Koblenz','Menü, Anlieferung, Anrichten'),
 ('Sara Rottenburg','WHU Eventmanagement','WHU','Raum, Zugang, Licht, Küche, Technik'),
 ('Benedikt Friedrich','Getränke','IdeaLab','Getränke, zentrale Getränkeorga'),
 ('Paul Läufer','Sponsor Dinner Vorjahr','IdeaLab','Erfahrung, Material, Fahrstuhl, Lagerung'),
 ('HfM','Material','HfM','Geschirr und Aufbaumaterial'),
 ('Student Reps','Schichtplanung','IdeaLab','Schichtzeiten und Besetzung'),
 ('Sponsoring-Team','Gäste','IdeaLab','Gäste- und Sponsorenkontakt'),
 ('Vorstand','Entscheidungen','IdeaLab e.V.','Programm, Redner, Budget, Einlasszeit'),
 ('Technik','Licht & Ton','IdeaLab / WHU','Scheinwerfer, Uplights, Mikro'),
 ('Nachbarteam','Deep Tech Dinner','IdeaLab','Gemeinsame Tischwäsche'),
 ('Gala-Team','Gala Dinner Stadthalle','IdeaLab','Entsorgung, Material-Konkurrenz'),
]
contacts = [dict(name=n, role=r, org=o, responsible_for=f, sort=i, phone='0261 / 44400' if n.startswith('Kai') else '') for i, (n, r, o, f) in enumerate(C)]

E = [
 ('17:30','','Vorbereitung','Vor Ort, Schlüssel und Raumzustand prüfen','Marlon',False),
 ('18:00','','Set-up','Set-up-Briefing, Check-in der 5 Personen','Marlon',False),
 ('18:00','18:10','Set-up','Raumcheck, Licht und Technik testen','Set-up-Crew',False),
 ('18:10','18:35','Set-up','Tische stellen nach Raumplan','Set-up-Crew',False),
 ('18:35','18:50','Set-up','Tischwäsche auflegen, Molton drunter','Set-up-Crew',False),
 ('18:45','','Küche','Anrichten beginnt – Schicht startet laut Plan erst 19:15','Küche (4)',True),
 ('18:50','19:05','Set-up','Eindecken: Teller, Besteck, Gläser, Servietten','Set-up-Crew',False),
 ('19:05','19:10','Set-up','Deko, Menükarten, Tischnummern','Set-up-Crew',False),
 ('19:10','','Set-up','Musik an, Licht auf Abendstimmung','Marlon',False),
 ('19:10','19:15','Übergabe','Kurzbriefing aller 19 (nicht auf 19:15 – kollidiert mit Einlass)','Marlon',True),
 ('19:15','19:30','Empfang','Einlass, Tablett-Service Wasser und Wein','2 Service + 2 Set-up',False),
 ('19:30','','Empfang','Gäste nehmen Platz, leere Gedecke abräumen','Service',False),
 ('19:35','19:40','Programm','Begrüßung (3–5 Min), Musik aus','IdeaLab',False),
 ('19:45','','Service','Vorspeise Welle 1, dann Welle 2','Küche + Service',False),
 ('19:50','','Service','Erste Weinrunde','3 aus Service',False),
 ('20:05','','Service','Vorspeise abräumen','Service',False),
 ('20:12','','Service','Hauptgang Welle 1 und 2 – kritischster Moment','Küche + Service',True),
 ('20:18','','Service','Weinrunde','3 aus Service',False),
 ('20:45','','Service','Hauptgang abräumen','Service',False),
 ('20:50','','Programm','Sponsorenwort, zweite Rede, Musik aus','IdeaLab',False),
 ('21:00','','Service','Dessert einsetzen, Kaffee ausschenken','Küche + Service',False),
 ('21:05','','Crew','Essen und Kurzpause für die 5 mit Doppelschicht','Marlon',True),
 ('21:20','','Service','Dessert abräumen, Bar bleibt offen','Service',False),
 ('21:30','','Transfer','Bus-Transfer – gilt er für unsere Gäste?','offen',True),
 ('21:30','22:00','Abbau','Tear-down beginnt, leise solange Gäste da sind','Tear-down (5)',False),
 ('22:00','22:30','Abbau','Geschirr spülen und sortieren, Wäsche einsammeln','Tear-down',False),
 ('22:30','22:50','Abbau','Tische und Stühle zurück, Leergut raus','Tear-down',False),
 ('22:50','23:00','Abbau','Endkontrolle, Übergabe an den Hausmeister','Marlon',False),
]
schedule = [dict(kind='abend', day=SA, start_time=a, end_time=b, phase=p, title=t, who=w, flagged=f) for a, b, p, t, w, f in E]
W = [
 (DI,'Anfragen raus, WhatsApp-Gruppen anlegen, Leads benennen'),
 (MI,'Mensa-Termin mit Sara, Tischstellung, Karten final, Bestellungen fixieren'),
 (DO,'S&G liefert 740 Geschirrteile, Menükarten in Druck, Crew-Briefing raus'),
 (FR,'Vormittags Raum ansehen und messen, Material hoch, Technik testen, Einkauf. Abends Deep Tech Dinner im selben Raum'),
 (SA,'17:30 Aufbau, 19:00 Event, 23:00 Ende'),
 (SO,'Rückgabe an HfM, Wäsche, Abrechnung, Debrief'),
]
schedule += [dict(kind='woche', day=d, title=t) for d, t in W]
D = [
 (MI,'12:00','Menü, Personenzahl, Getränkebestellung, Tischstellung fix'),
 (DO,'12:00','Deko und Einkaufsliste fix'),
 (FR,'12:00','Raumplan, Minutenplan und Crew-Einteilung fix'),
 (FR,'18:00','Änderungsstopp'),
]
schedule += [dict(kind='deadline', day=d, start_time=t, title=x, flagged=True) for d, t, x in D]

SH = [
 ('setup','Set-up','18:00','19:30','SD Set-up',1),
 ('service','Service','19:15','21:30','SD Service',2),
 ('bar','Bar','19:15','21:30','SD Bar & Küche',3),
 ('kueche','Küche','19:15','21:30','SD Bar & Küche',4),
 ('teardown','Tear-down','21:30','23:00','SD Tear-down',5),
]
shifts = [dict(id=i, label=l, start_time=a, end_time=b, whatsapp=w, sort=s) for i, l, a, b, w, s in SH]
CR = {
 'setup': ['Laura Stehlin','Alexander Joachim','Nicolas Boisseree','Hendrik Rei','David Boehm'],
 'service': ['Johanna Muehlbauer','Flore Glaesener','Sophie Mril','Kristina Bartelt','Jette Kasper','Adele Bhandari','Alexis Wesemann','Constantin Oberbracht'],
 'bar': ['Marc Steinhaeuser','Celina Clausen'],
 'kueche': ['Emilie Song','Moritz Hoffmann','Hussein Abdullah','Chiara Giesting'],
 'teardown': ['Celina Clausen','Marc Steinhaeuser','Johanna Muehlbauer','Kristina Bartelt','Sophie Mril'],
}
people = {}
for sid in ['setup','service','bar','kueche','teardown']:
    for n in CR[sid]:
        people.setdefault(n, []).append(sid)
crew = [dict(name=n, shifts=s) for n, s in people.items()]

sql = ["-- Seed: Planungsstand Di 22.09.2026. Nur einmal ausführen.",
       "do $$ begin if exists (select 1 from tasks) then raise exception 'Seed schon eingespielt – abgebrochen.'; end if; end $$;\n"]
sql.append(insert('tasks', ['area','title','contact','priority','due','status','answer','sort'], tasks))
sql.append(insert('materials', ['category','item','quantity','source','needed_when','status','notes','sort'], materials))
sql.append(insert('contacts', ['name','role','org','responsible_for','phone','sort'], contacts))
sql.append(insert('schedule', ['kind','day','start_time','end_time','phase','title','who','flagged'], [dict({'end_time':'','phase':'','who':'','flagged':False,'start_time':''}, **r) for r in schedule]))
sql.append(insert('shifts', ['id','label','start_time','end_time','whatsapp','sort'], shifts))
sql.append(insert('crew', ['name','shifts'], crew))
Path('supabase/002_seed.sql').write_text("\n".join(sql))
print(len(tasks), len(materials), len(contacts), len(schedule), len(crew))

# Demo-Daten für den Offline-Modus (ohne Supabase)
import json, uuid
def ids(rows):
    return [dict(r, id=r.get('id') or str(uuid.uuid4())) for r in rows]
demo = dict(tasks=ids(tasks), materials=ids(materials), contacts=ids(contacts),
            schedule=ids([dict({'end_time':'','phase':'','who':'','flagged':False,'start_time':'','notes':''}, **r) for r in schedule]),
            shifts=shifts, crew=ids(crew))
Path('src/lib/demo.json').write_text(json.dumps(demo, ensure_ascii=False))
