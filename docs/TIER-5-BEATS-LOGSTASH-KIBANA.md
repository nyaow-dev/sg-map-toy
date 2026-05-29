# Tier 5 — Observability: Filebeat + Logstash + Kibana

Ship API logs into Elasticsearch and build a Kibana dashboard.
Estimated time: 5–7 days.

---

## Why this order: structured logs first

You cannot get value from log shipping if the logs are unreadable.
`console.log('something happened')` is useless in Kibana.
A structured JSON line like:
```json
{"level":"info","route":"/api/pois","method":"GET","status":200,"response_ms":45}
```
becomes a searchable, filterable, aggregatable document in ES.

Do 5.1 before touching Logstash or Filebeat.

---

## 5.1 — Structured logging in the API

### Install Pino

```bash
cd apps/api
npm install pino pino-pretty
```

### Create src/lib/logger.js

```javascript
import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    // Pretty print in dev, JSON in production
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true }
        }
    }),
    base: {
        service: 'sg-map-api',
        env:     process.env.NODE_ENV || 'development'
    }
});
```

### Add request logging middleware to src/index.js

```javascript
import { logger } from './lib/logger.js';

// Log every request with timing
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        // Skip health check noise
        if (req.path === '/health') return;

        logger.info({
            route:       req.path,
            method:      req.method,
            status:      res.statusCode,
            response_ms: Date.now() - start,
            query:       req.query
        });
    });
    next();
});
```

### Replace console calls in routes/pois.js

```javascript
import { logger } from '../lib/logger.js';

// Replace: console.warn('ES unavailable...')
// With:
logger.warn({ reason: esErr.message }, 'ES unavailable, falling back to Supabase');

// Replace: console.error('ES search error:', err)
// With:
logger.error({ err }, 'ES search error');
```

### Redirect logs to a file locally (for Filebeat to read)

Update `dev.bat` API launch line to tee output to a log file:

```bat
start "SG Map API" cmd /k "nvm use 20 && npm run dev > ..\..\logs\api.log 2>&1"
```

Create the logs directory:
```powershell
mkdir logs
```

Add to `.gitignore`:
```
logs/
```

Verify log file is being written after starting the API and hitting an endpoint:
```powershell
type logs\api.log
```

---

## 5.2 — Logstash pipeline

### Update docker-compose.yml

Add Logstash to `infra/elastic/docker-compose.yml`:

```yaml
logstash:
  image: docker.elastic.co/logstash/logstash:8.13.0
  container_name: sg-map-logstash
  ports:
    - "5044:5044"   # Beats input
    - "9600:9600"   # Logstash monitoring API
  volumes:
    - ../logstash/pipeline:/usr/share/logstash/pipeline
    - ../logstash/logstash.yml:/usr/share/logstash/config/logstash.yml
  depends_on:
    elasticsearch:
      condition: service_healthy
```

### Create infra/logstash/logstash.yml

```yaml
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: ["http://elasticsearch:9200"]
pipeline.ecs_compatibility: disabled
```

### Create infra/logstash/pipeline/api-logs.conf

```
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse the JSON log line from Pino
  json {
    source => "message"
    target => "log"
  }

  # Promote key fields to top level for easier querying
  if [log][route] {
    mutate {
      add_field => {
        "route"       => "%{[log][route]}"
        "method"      => "%{[log][method]}"
        "status"      => "%{[log][status]}"
        "response_ms" => "%{[log][response_ms]}"
        "level"       => "%{[log][level]}"
        "service"     => "%{[log][service]}"
      }
    }
  }

  # Use the log timestamp as @timestamp
  if [log][time] {
    date {
      match => ["[log][time]", "ISO8601"]
      target => "@timestamp"
    }
  }

  # Drop health check pings — they create noise
  if [route] == "/health" {
    drop {}
  }

  # Tag slow requests
  if [response_ms] and [response_ms] > 1000 {
    mutate {
      add_tag => ["slow_request"]
    }
  }
}

output {
  elasticsearch {
    hosts    => ["http://elasticsearch:9200"]
    index    => "sg-api-logs-%{+YYYY.MM.dd}"
  }

  # Also print to Logstash stdout for debugging
  stdout {
    codec => rubydebug
  }
}
```

### Verify Logstash started

```bash
curl http://localhost:9600
# Should return Logstash version JSON
```

---

## 5.3 — Filebeat

### Add Filebeat to docker-compose.yml

```yaml
filebeat:
  image: docker.elastic.co/beats/filebeat:8.13.0
  container_name: sg-map-filebeat
  user: root
  volumes:
    - ../filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    - ../../logs:/logs:ro          # mount the API log file
  depends_on:
    - logstash
```

### Create infra/filebeat/filebeat.yml

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /logs/api.log
    fields:
      service: sg-map-api
      environment: development
    fields_under_root: true
    # Handle multi-line JSON (Pino outputs one JSON object per line)
    multiline.type: pattern
    multiline.pattern: '^\{'
    multiline.negate: true
    multiline.match: after

output.logstash:
  hosts: ["logstash:5044"]

# Filebeat monitoring
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
```

### Restart the stack and verify

```bash
cd infra/elastic
docker compose down
docker compose up -d

# Check Filebeat is harvesting the log file
docker logs sg-map-filebeat

# Hit the API a few times to generate logs
curl http://localhost:3001/api/pois

# Check documents arrived in ES
curl http://localhost:9200/sg-api-logs-*/_count
```

---

## 5.4 — Kibana dashboard

### Create the Data View

1. Open http://localhost:5601
2. ☰ → Stack Management → Data Views → Create data view
3. Name: `API Logs`
4. Index pattern: `sg-api-logs-*`
5. Timestamp: `@timestamp`
6. Save

### Build the dashboard

Go to ☰ → Dashboard → Create dashboard. Add these panels:

**Panel 1 — Request volume over time**
- Visualisation type: Bar chart
- Horizontal axis: `@timestamp` (date histogram, interval: Auto)
- Vertical axis: Count
- Break down by: `level` (keyword)

**Panel 2 — Error rate by route**
- Visualisation type: Data table
- Rows: `route` (terms, top 10)
- Metrics: Count
- Add filter: `level: error`

**Panel 3 — Average response time by route**
- Visualisation type: Bar chart (horizontal)
- Horizontal axis: Average of `response_ms`
- Vertical axis: `route` (terms, top 10)

**Panel 4 — Slowest requests**
- Visualisation type: Data table
- Columns: `@timestamp`, `route`, `method`, `status`, `response_ms`
- Sort: `response_ms` descending
- Add filter: tag `slow_request`

### Export dashboard for version control

☰ → Stack Management → Saved Objects → select your dashboard → Export

Save to `infra/kibana/dashboard-api-logs.ndjson` and commit it.
This lets you reimport the dashboard after wiping the ES volume:

```
POST http://localhost:5601/api/saved_objects/_import
```

---

## Checklist

- [ ] Pino logger installed and replacing all console calls
- [ ] Request middleware logging route, method, status, response_ms
- [ ] Log file being written to `logs/api.log` locally
- [ ] Logstash container running, accessible at port 9600
- [ ] `sg-api-logs-*` index appearing in ES after hitting API endpoints
- [ ] Kibana Data View created for `sg-api-logs-*`
- [ ] Dashboard built with 4 panels
- [ ] Dashboard exported to `infra/kibana/dashboard-api-logs.ndjson`

**→ When all boxes are checked, proceed to `TIER-6-METRICBEAT.md`**
