# Toy Project Roadmap — SG Map App

One month to get as close to the production stack as possible.
Each tier is independently useful — stop wherever time runs out.

---

## What you are building

A Singapore neighbourhood map application that displays points of interest,
lets you search and filter them via Elasticsearch, and manages them through
a CRUD form. The stack mirrors production as closely as free-tier constraints allow.

### Production → Toy mapping

| Production | Toy equivalent |
|---|---|
| ExtJS 7.4.0 + Sencha Architect + Eclipse | ExtJS 7.4.0 + VS Code (migrate to Eclipse in Tier 4) |
| On-prem PostgreSQL + PostGIS | Supabase (PostgreSQL + PostGIS, free tier) |
| Elasticsearch + full Beats suite + Logstash | Elasticsearch + Kibana only (Docker) |
| GeoServer + MBTiles + self-hosted OSM | OpenLayers + OSM tile CDN |
| Tomcat 9 | Vercel (front-end) + Cloud Run (API) |
| Logstash pipelines | Node.js seed/sync scripts |

---

## Tier 0 — Environment setup (Day 1)

**Goal:** Every tool installed and talking to each other. No app code yet.

- [ ] Docker Desktop running
- [ ] Node.js 20 LTS installed
- [ ] VS Code with recommended extensions installed
- [ ] Elasticsearch 8.13 + Kibana running locally via Docker
- [ ] Supabase project created, PostGIS extension enabled
- [ ] Confirm ES health at `http://localhost:9200`
- [ ] Confirm Kibana at `http://localhost:5601`
- [ ] Confirm Supabase DB connection string in hand

**Output:** A working local infrastructure, nothing deployed yet.

See: `TIER-0-SETUP.md`

---

## Tier 1 — ExtJS app skeleton + map (Days 2–6)

**Goal:** A running ExtJS application in VS Code that loads an OpenLayers map
centred on your neighbourhood in Bedok, with hardcoded markers.

- [ ] ExtJS 7.4.0 SDK in place (see note below on licensing)
- [ ] Sencha CMD installed and generating the app scaffold
- [ ] OpenLayers integrated as a vendor library
- [ ] Map loads centred on Bedok, Singapore
- [ ] Two or three hardcoded markers of different icon types render on the map
- [ ] App builds and opens in browser via `sencha app watch`

**Output:** Visual proof the ExtJS + map stack works before wiring any data.

See: `TIER-1-EXTJS-MAP.md`

---

## Tier 2 — Elasticsearch data layer (Days 7–12)

**Goal:** Real data flows from a seed script into Elasticsearch,
and the ExtJS app displays it in a Grid panel fetched live.

- [ ] ES index template for Singapore POI data created
- [ ] Ingest pipeline created (normalise category, tag geolocation)
- [ ] Seed script inserts ~50 Bedok POIs (hawker centres, MRT, parks, etc.)
- [ ] Node.js Express API created with two endpoints:
  - `GET /api/pois` — search/filter POIs from ES
  - `POST /api/pois`, `PUT /api/pois/:id`, `DELETE /api/pois/:id` — CRUD
- [ ] ExtJS Grid panel wired to `GET /api/pois`
- [ ] Map markers driven by the same API response (not hardcoded)

**Output:** Data-driven map and grid. Core of the production workflow.

See: `TIER-2-ELASTICSEARCH.md`

---

## Tier 3 — CRUD form + Supabase (Days 13–20)

**Goal:** A form panel that creates/edits/deletes POIs, writing to both
Elasticsearch and Supabase (mirroring the production dual-write pattern
where PostGIS holds the source of truth and ES holds the search index).

- [ ] Supabase `pois` table created with PostGIS `geography` column
- [ ] API updated to dual-write: Supabase (source of truth) + ES (search index)
- [ ] ExtJS Form panel wired to the API
- [ ] Create, update, delete all work end-to-end
- [ ] Grid and map refresh after mutations

**Output:** Full CRUD loop mirroring the production write pattern.

See: `TIER-3-CRUD-SUPABASE.md`

---

## Tier 4 — Deployment + Eclipse migration (Days 21–28)

**Goal:** App deployed to free-tier cloud. Optional: migrate to Eclipse workflow.

- [ ] API containerised and deployed to Google Cloud Run
- [ ] Front-end deployed to Vercel
- [ ] Environment variables handled properly (no secrets in code)
- [ ] (Optional) Eclipse JEE 2025 installed
- [ ] (Optional) ExtJS project imported into Eclipse
- [ ] (Optional) Sencha Architect opened — explore visual layout vs code approach

**Output:** A live URL you can share. Eclipse familiarity if you got there.

See: `TIER-4-DEPLOY-ECLIPSE.md`

---

## Tier 5 — Stretch goals (if time remains)

These are lower priority but good exposure before the production project.

- [ ] Add TypeScript to the Node.js API (gradual, not a rewrite)
- [ ] Add one Kibana dashboard for POI data (category breakdown, map heatmap)
- [ ] Add Filebeat to ship API logs into Elasticsearch
- [ ] Explore ES|QL queries against your POI index in Kibana Dev Tools
- [ ] Add a simple keyword + geo distance hybrid search endpoint

---

## File layout (full project)

```
sg-map-toy/
├── docs/
│   ├── ROADMAP.md              ← this file
│   ├── TIER-0-SETUP.md
│   ├── TIER-1-EXTJS-MAP.md
│   ├── TIER-2-ELASTICSEARCH.md
│   ├── TIER-3-CRUD-SUPABASE.md
│   └── TIER-4-DEPLOY-ECLIPSE.md
├── apps/
│   ├── extjs-app/              ← ExtJS front-end (Sencha CMD project)
│   └── api/                    ← Node.js Express API
└── infra/
    └── elastic/                ← Docker Compose + ES config
```
