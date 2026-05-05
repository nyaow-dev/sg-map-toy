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
| --- | --- |
| ExtJS 7.4.0 + Sencha Architect + Eclipse | ExtJS 7.4.0 + VS Code (migrate to Eclipse in Tier 4) |
| On-prem PostgreSQL + PostGIS | Supabase (PostgreSQL + PostGIS, free tier) |
| Elasticsearch + full Beats suite + Logstash | Elasticsearch + Kibana only (Docker) |
| GeoServer + MBTiles + self-hosted OSM | OpenLayers + OSM tile CDN |
| Tomcat 9 | Vercel (front-end) + Cloud Run (API) |
| Logstash pipelines | Node.js seed/sync scripts |

---

## Commands

### Backend

```bash
cd apps/api
npm run dev
```

### Frontend (Sencha)

```bash
cd apps/extjs-app
npx serve .
```

> Url: <http://localhost:3000/>

## Elastic search

### Check elastic search is running in docker

```bash
cd apps/api
node scripts/health-check.js
```

> Elastic Dev Console: <http://localhost:5601/app/dev_tools#/console>

---

### Progess

- [x] Tier 0 — Environment setup (Day 1)
- [x] Tier 1 — ExtJS app skeleton + map (Days 2–6)
- [ ] Tier 2 — Elasticsearch data layer (Days 7–12)
- [ ] Tier 3 — CRUD form + Supabase (Days 13–20)
- [ ] Tier 4 — Deployment + Eclipse migration (Days 21–28)
- [ ] Tier 5 — Stretch goals (if time remains)

---

## File layout (full project)

```text
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
