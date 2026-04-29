# Tier 0 — Environment Setup

Get every tool installed and talking before writing a single line of app code.
Estimated time: 2–4 hours.

---

## 1. VS Code extensions to install

Open VS Code → Extensions (`Ctrl+Shift+X`) and install:

| Extension | Why |
| --------- | --- |
| `dbaeumer.vscode-eslint` | JS/TS linting |
| `esbenp.prettier-vscode` | Auto-formatting |
| `ms-vscode.vscode-typescript-next` | Better TS support |
| `mtxr.sqltools` | Query Supabase from VS Code |
| `mtxr.sqltools-driver-pg` | PostgreSQL driver for SQLTools |
| `rangav.vscode-thunder-client` | REST client (like Postman, built in) |
| `ms-azuretools.vscode-docker` | Docker container management |

---

## 2. Start Elasticsearch + Kibana

The `infra/elastic/docker-compose.yml` in this project runs Elasticsearch 8.13
and Kibana. From the project root:

```bash
cd infra/elastic
docker compose up -d
```

Verify:

```bash
# Should return cluster health JSON
curl http://localhost:9200/_cluster/health

# Kibana — takes ~60s to boot (windows)
start http://localhost:5601

# Kibana — takes ~60s to boot (linux)
open http://localhost:5601
```

> Note: This uses Elasticsearch 8.13 (same major version as production's 9.x,
> close enough for learning purposes — the API surface is the same).
> When you move to production, the team will be on 9.x, but everything
> you learn transfers directly.

---

## 3. Set up Supabase

1. Go to <https://supabase.com> and create a free account
2. Create a new project — name it `sg-map-toy`, pick the Singapore region
3. Wait for it to provision (~2 minutes)
4. Go to **Project Settings → Database** and copy the connection string
   (looks like `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`)
5. Go to **SQL Editor** and enable PostGIS:

    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;

    -- Verify it worked
    SELECT postgis_version();
    ```

6. Create the POIs table:

    ```sql
    CREATE TABLE pois (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT,
      address     TEXT,
      location    GEOGRAPHY(POINT, 4326) NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Spatial index for geo queries
    CREATE INDEX pois_location_idx ON pois USING GIST(location);

    -- Index for category filtering
    CREATE INDEX pois_category_idx ON pois(category);
    ```

7. Go to **Project Settings → API** and copy:
   - Project URL (`https://[ref].supabase.co`)
   - `anon` public key
   - `service_role` secret key (keep this server-side only)

---

## 4. Create your environment file

In `apps/api/`, create a `.env` file (this is gitignored):

```env
# Elasticsearch
ES_URL=http://localhost:9200
ES_INDEX=sg-pois

# Supabase
SUPABASE_URL=https://[your-ref].supabase.co
SUPABASE_SERVICE_KEY=[your-service-role-key]

# API
PORT=3001
NODE_ENV=development
```

---

## 5. Install API dependencies

```bash
cd apps/api
npm install
```

---

## 6. Verify everything talks

```bash
# From apps/api/
node scripts/health-check.js
```

Expected output:
```
✓ Elasticsearch: green
✓ Supabase: connected (PostGIS enabled)
✓ Environment ready
```

---

## 6. ExtJS SDK — important note

ExtJS 7.4.0 is a **commercial framework**. You need either:

- **Option A (recommended):** Get the SDK from your production team.
  They will have a licensed copy. Ask for the `ext-7.4.0` folder.

- **Option B:** Download the GPL trial from https://www.sencha.com/products/extjs/
  This works for open-source/personal use but has licence restrictions.

- **Option C (temporary):** The Tier 1 scaffold works without the full SDK
  by loading ExtJS from the Sencha CDN. This lets you start building
  while you sort out the SDK. Note the CDN version is read-only —
  you cannot customise it.

Once you have the SDK, place it at `apps/extjs-app/ext/` and proceed to Tier 1.

---

## Checklist

- [x] VS Code extensions installed
- [x] `docker compose up -d` running — ES green, Kibana accessible
- [x] Supabase project created, PostGIS enabled, `pois` table created
- [x] `.env` file populated with real values
- [x] `node scripts/health-check.js` passes all three checks
- [x] ExtJS SDK obtained (or CDN path noted as temporary)

**→ When all boxes are checked, proceed to `TIER-1-EXTJS-MAP.md`**
