# SG Map Toy Project — Roadmap

One month to get as close to the production stack as possible.
Each tier is independently useful — stop wherever time runs out.

---

## What you are building

A Singapore neighbourhood map application that displays points of interest,
lets you search and filter them via Elasticsearch, and manages them through
a CRUD form. The stack mirrors production as closely as free-tier constraints allow.

### Production → Toy mapping

| Production | Toy equivalent |
| ---------- | -------------- |
| ExtJS 7.4.0 + Sencha Architect + Eclipse | ExtJS 7.4.0 + VS Code (migrate to Eclipse in Tier 4) |
| On-prem PostgreSQL + PostGIS | Supabase (PostgreSQL + PostGIS, free tier) |
| Elasticsearch + full Beats suite + Logstash | Elasticsearch + Kibana only (Docker) |
| GeoServer + MBTiles + self-hosted OSM | OpenLayers + OSM tile CDN |
| Tomcat 9 | Vercel (front-end) + Cloud Run (API) |
| Logstash pipelines | Node.js seed/sync scripts |

---

## Completed tiers

### Tier 0 — Environment setup ✅

- Docker Desktop, Node 20, VS Code extensions
- Elasticsearch + Kibana via Docker
- Supabase project, PostGIS enabled, pois table created
- Health check script passing

### Tier 1 — ExtJS app skeleton + map ✅

- ExtJS 6.2.0 GPL loaded from local vendor folder
- OpenLayers map rendering consistently via boxready hook
- Border layout: north toolbar, center map, east grid panel
- Hardcoded Bedok markers loading via mapready custom event
- Deployed to Vercel (static file serving, no build step)

### Tier 2 — Elasticsearch data layer ✅

- ES index template registered (sg-pois-main)
- Ingest pipeline registered (normalise, geo_point, slow_request tag)
- 44 real Bedok POIs seeded
- Node API with ES search (partial match via match_phrase_prefix + fuzziness)
- ES availability check with 30s cache, Supabase fallback
- Grid and map driven by live API data
- Category filter and text search wired end to end

### Tier 3 — CRUD form + Supabase dual-write ✅

- Supabase get_pois() RPC function for clean lat/lng extraction
- Dual-write: Supabase (source of truth) → ES (search index)
- PoiForm window with coordinate validation (Singapore bounding box)
- Map click pre-fills coordinates in form
- Duplicate submit guards: button disable + window singleton + API 10s check
- Delete forces ES index refresh before API responds
- Deployed API to Cloud Run via GitHub Actions (Workload Identity)

### Tier 4 — Deployment ✅

- API on Cloud Run (asia-southeast1, max 1 instance)
- Frontend on Vercel (static, vendor folder for ExtJS + theme files)
- CORS configured for Vercel preview + production URLs
- ES falls back to Supabase when ES_URL is empty (Cloud Run has no ES)
- config.js switches API base URL between localhost and Cloud Run

---

## Upcoming tiers

### Tier 5 — Observability: Filebeat + Logstash + Kibana

**Goal:** Ship API logs into Elasticsearch and build a basic Kibana dashboard.
Estimated time: 5–7 days.

This is the minimal Beats workflow — one Beat (Filebeat), one pipeline
(Logstash), one destination (ES). Get this working first before adding
more Beats.

#### 5.1 — Structured logging in the API

Before shipping logs anywhere, make them worth shipping.
Replace ad-hoc `console.log` with structured JSON logging:

- [ ] Install `pino` logger: `npm install pino pino-pretty`
- [ ] Create `src/lib/logger.js` — Pino instance, JSON in prod, pretty in dev
- [ ] Replace all `console.log/warn/error` in routes with logger calls
- [ ] Each log line emits: `{ level, timestamp, service, route, method, status, response_ms, error? }`
- [ ] API writes logs to stdout (Cloud Run captures this automatically)
- [ ] Locally, redirect stdout to a log file for Filebeat to read

Example log line the pipeline will receive:

```json
{"level":"info","time":"2026-05-01T10:00:00Z","service":"sg-map-api","route":"/api/pois","method":"GET","status":200,"response_ms":45}
```

#### 5.2 — Logstash pipeline

- [ ] Add Logstash container to `infra/elastic/docker-compose.yml`
- [ ] Create `infra/logstash/pipeline/api-logs.conf`:
  - Input: Beats on port 5044
  - Filter: JSON parse, add `@timestamp` from log time field, drop health check pings
  - Output: Elasticsearch index `sg-api-logs-{+YYYY.MM.dd}` (daily rolling index)
- [ ] Create `infra/logstash/logstash.yml` (heap size, pipeline config path)
- [ ] Verify Logstash starts and connects to ES: `curl localhost:9600`

#### 5.3 — Filebeat

- [ ] Add Filebeat container to `docker-compose.yml`
- [ ] Create `infra/filebeat/filebeat.yml`:
  - Input: watch the API log file path
  - Output: Logstash at port 5044 (not directly to ES — Logstash transforms first)
  - Add field: `service: sg-map-api`
- [ ] Mount the API log file into the Filebeat container
- [ ] Confirm documents appearing in `sg-api-logs-*` in Kibana Discover

#### 5.4 — Kibana dashboard

- [ ] Create Data View for `sg-api-logs-*` with `@timestamp` as time field
- [ ] Build dashboard with these panels:
  - Request volume over time (date_histogram)
  - Error rate by route (terms + filter on level:error)
  - Average response time by route (avg aggregation)
  - Top slowest requests (top_hits sorted by response_ms desc)
- [ ] Export dashboard as `infra/kibana/dashboard-api-logs.ndjson` for version control

---

### Tier 6 — Metricbeat (system metrics)

**Goal:** Add server health metrics alongside application logs.
Estimated time: 2–3 days (much faster once Tier 5 infra is in place).

- [ ] Add Metricbeat container to `docker-compose.yml`
- [ ] Enable modules: `system` (CPU, memory, disk), `docker` (container stats)
- [ ] Confirm metrics appearing in `metricbeat-*` index
- [ ] Add panels to existing dashboard:
  - Container CPU usage over time
  - Memory usage trend
  - Disk I/O

Metricbeat ships directly to ES (no Logstash needed — data is already structured).

---

### Tier 7 — Heartbeat (uptime monitoring)

**Goal:** Monitor Cloud Run API and Supabase availability.
Estimated time: 1–2 days.

- [ ] Add Heartbeat container to `docker-compose.yml`
- [ ] Configure monitors:
  - HTTP monitor: `https://your-cloud-run-url/health` every 30s
  - HTTP monitor: `https://your-supabase-url/rest/v1/pois?limit=1` every 60s
- [ ] Confirm monitors appearing in Kibana Uptime app
- [ ] Set up a simple alert rule: notify (log to ES) if endpoint down for 2 consecutive checks

---

### Tier 8 — Winlogbeat (Windows event logs)

**Goal:** Understand Windows-specific log shipping, relevant to production on-prem servers.
Estimated time: 2–3 days.

Note: Winlogbeat runs on the host Windows machine, not in Docker.
This tier is more about understanding the production workflow than
building something new for the toy project.

- [ ] Install Winlogbeat on Windows host
- [ ] Configure to ship to local Logstash (port 5044)
- [ ] Enable channels: Application, System, Security
- [ ] Create Logstash pipeline variant for Windows events
- [ ] Confirm Windows events appearing in `winlogbeat-*` index in Kibana
- [ ] Add a Kibana panel: login events over time (EventID 4624)

---

### Tier 9 — Auditbeat and Packetbeat (stretch)

**Goal:** Exposure to security and network monitoring beats.
Estimated time: 3–4 days combined. Lower priority — do this if time permits before the production project starts.

**Auditbeat:**

- [ ] Run on host, monitor file integrity of `apps/api/src/`
- [ ] Track process starts/stops
- [ ] Confirm audit events in Kibana

**Packetbeat:**

- [ ] Monitor network traffic between API container and ES/Supabase
- [ ] Visualise HTTP transaction latency breakdown in Kibana
- [ ] Useful for understanding what the production network traffic looks like

---

## Suggested order within a week

If you have one week before the production project starts, prioritise:

| Day | Focus |
| --- | ----- |
| 1 | Tier 5.1 — structured logging in API |
| 2 | Tier 5.2 — Logstash pipeline |
| 3 | Tier 5.3 — Filebeat wired up |
| 4 | Tier 5.4 — Kibana dashboard |
| 5 | Tier 6 — Metricbeat (quick win, infra already in place) |
| 6 | Tier 7 — Heartbeat (uptime monitors for Cloud Run + Supabase) |
| 7 | Tier 8 — Winlogbeat (production-relevant Windows log shipping) |

Tiers 9 is stretch — come back to it after you've been on the production project for a few weeks and have real context for what Auditbeat and Packetbeat are used for there.

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
