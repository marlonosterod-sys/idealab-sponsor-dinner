# Sponsor Dinner · Command Center

Planungstool für das Sponsor Dinner der WHU Founders' Conference (Sa 26.09.2026, Neue Mensa).
React + Vite · Supabase (Daten + Realtime) · Vercel (Hosting + API). Design aus dem IdeaLab!-NFS-Dashboard.

**Bereiche:** Übersicht · Aufgaben & Fragen · Material · Kontakte (mit Fragen-Nachricht zum Kopieren) · Ablauf (Minutenplan + Wochenkalender) · Crew (Schichten, Leads, Infonachricht) · Raumplan (Mensa-Grundriss, Tischvarianten, Zonen, Licht, Kollisions- und Abstandsprüfung, PNG-Export) · Protokoll.

Lesen kann jeder mit dem Link. Bearbeiten nur nach Team-Passwort (Cookie, 12 h). Ohne Supabase-Variablen läuft die App im **Demo-Modus** mit den Startdaten.

## 1 · Supabase
1. Neues Projekt, Region Frankfurt (eu-central-1).
2. SQL Editor → `supabase/001_schema.sql` ausführen.
3. SQL Editor → `supabase/002_seed.sql` ausführen (Planungsstand 22.09., bricht ab, wenn schon Daten da sind).
4. Settings → API: **Project URL**, **Publishable Key** und **Service Role Key** notieren.

## 2 · GitHub
```bash
cd ~/Developer/idealab-sponsor-dinner
git init && git add . && git commit -m "Sponsor Dinner Command Center"
git branch -M main
git remote add origin https://github.com/DEIN-USER/idealab-sponsor-dinner.git
git push -u origin main
```

## 3 · Vercel
Add New → Project → Repo importieren (Vite wird erkannt). Environment Variables:

| Name | Wert |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (**nur hier**, nie im Code) |
| `EDIT_PASSWORD` | euer Team-Passwort |
| `EDIT_SESSION_SECRET` | lange Zufallszeichenkette (`openssl rand -hex 32`) |

Deploy. Jeder Push auf `main` deployt automatisch.

## Lokal
```bash
npm install
npm run dev        # Demo-Modus ohne .env, oder .env.local mit den VITE_-Werten
```
Die API (`/api/*`) läuft nur auf Vercel bzw. mit `vercel dev`.

## Raumplan-Geometrie
`src/planner/walls.json` + `public/mensa-plan.svg` sind aus dem Feuerwehrplan (EG, 2010) extrahiert und über das 5-m-Raster auf Meter kalibriert (±0,3 m). Raumnamen und Saalgrenzen: `src/planner/geometry.ts`. Bei genaueren Maßen von Sara dort anpassen.

## Startdaten ändern
`scripts/build_seed.py` bearbeiten → `python3 scripts/build_seed.py` → erzeugt `supabase/002_seed.sql` und `src/lib/demo.json`.
