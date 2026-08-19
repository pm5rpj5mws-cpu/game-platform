# game-platform
Meine eigene Spieleplattform

## Backend & Datenbank

Node.js/Express-Server (`server/`) + PostgreSQL für Benutzerkonten, Spielstände,
Favoriten und globale Bestenlisten. Nicht eingeloggte Besucher spielen weiterhin lokal
über `localStorage` (Gast-Modus).

**Lokal starten:**
```
docker compose up --build
```
Dann `http://localhost:3000` öffnen.

**Deployment (Coolify):**
1. Postgres-Ressource in Coolify anlegen.
2. Neuen App-Service aus diesem Repo anlegen (Dockerfile wird automatisch erkannt).
3. Env-Variablen setzen: `DATABASE_URL` (von der Postgres-Ressource), `COOKIE_SECURE=true`.
4. Deployen – Tabellen werden beim ersten Start automatisch angelegt.
