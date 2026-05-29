# Tiers 6–9 — Metricbeat, Heartbeat, Winlogbeat, Auditbeat + Packetbeat

---

# Tier 6 — Metricbeat

System and container metrics. Much faster to set up than Tier 5
because the Logstash + ES infrastructure is already running.

Estimated time: 2–3 days.

---

## Add Metricbeat to docker-compose.yml

```yaml
metricbeat:
  image: docker.elastic.co/beats/metricbeat:8.13.0
  container_name: sg-map-metricbeat
  user: root
  volumes:
    - ../metricbeat/metricbeat.yml:/usr/share/metricbeat/metricbeat.yml:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro   # for Docker module
    - /sys/fs/cgroup:/hostfs/sys/fs/cgroup:ro        # for system module
    - /proc:/hostfs/proc:ro
    - /:/hostfs:ro
  environment:
    - ELASTICSEARCH_HOST=http://elasticsearch:9200
  depends_on:
    elasticsearch:
      condition: service_healthy
```

---

## Create infra/metricbeat/metricbeat.yml

```yaml
metricbeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false

metricbeat.modules:

  # System metrics — CPU, memory, disk, network
  - module: system
    metricsets:
      - cpu
      - memory
      - disk
      - network
      - process
    enabled: true
    period: 30s
    processes: ['.*']
    cpu.metrics: ["percentages", "normalized_percentages"]
    core.metrics: ["percentages"]

  # Docker container metrics
  - module: docker
    metricsets:
      - container
      - cpu
      - memory
      - network
    hosts: ["unix:///var/run/docker.sock"]
    period: 30s
    enabled: true

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "metricbeat-%{+YYYY.MM.dd}"

setup.kibana:
  host: "http://kibana:5601"

# Let Metricbeat create its own index template and dashboards
setup.dashboards.enabled: true
setup.template.enabled: true
```

---

## Verify

```bash
# Check metricbeat index exists after ~30s
curl http://localhost:9200/metricbeat-*/_count

# Built-in Metricbeat dashboards are auto-imported into Kibana
# Go to Kibana → Dashboard → search "Metricbeat"
```

Metricbeat ships pre-built Kibana dashboards — you get container CPU,
memory, and disk charts for free without building anything.

---

## Checklist

- [ ] Metricbeat container running
- [ ] `metricbeat-*` index appearing in ES
- [ ] System module data visible (CPU %, memory %)
- [ ] Docker module data visible (container stats)
- [ ] Pre-built Metricbeat dashboards loading in Kibana

---

---

# Tier 7 — Heartbeat

Uptime monitoring for Cloud Run and Supabase.
Estimated time: 1–2 days.

---

## Add Heartbeat to docker-compose.yml

```yaml
heartbeat:
  image: docker.elastic.co/beats/heartbeat:8.13.0
  container_name: sg-map-heartbeat
  user: root
  volumes:
    - ../heartbeat/heartbeat.yml:/usr/share/heartbeat/heartbeat.yml:ro
  depends_on:
    elasticsearch:
      condition: service_healthy
```

---

## Create infra/heartbeat/heartbeat.yml

```yaml
heartbeat.monitors:

  # Cloud Run API health check
  - type: http
    id: cloud-run-api
    name: "SG Map API (Cloud Run)"
    urls: ["https://sg-map-api-xsbo7cqsfa-uw.a.run.app/health"]
    schedule: "@every 30s"
    check.response.status: [200]

  # Supabase availability
  - type: http
    id: supabase-db
    name: "Supabase POIs endpoint"
    urls: ["https://your-ref.supabase.co/rest/v1/pois?limit=1"]
    schedule: "@every 60s"
    check.response.status: [200]
    headers:
      apikey: "${SUPABASE_ANON_KEY}"

  # Local Elasticsearch (when running dev stack)
  - type: http
    id: local-elasticsearch
    name: "Elasticsearch (local)"
    urls: ["http://elasticsearch:9200/_cluster/health"]
    schedule: "@every 30s"
    check.response.status: [200]

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "heartbeat-%{+YYYY.MM.dd}"

setup.kibana:
  host: "http://kibana:5601"

setup.dashboards.enabled: true
```

---

## View in Kibana

Kibana has a dedicated Uptime app:
☰ → Observability → Uptime

You'll see each monitor with its current status, response time,
and history. Green = up, Red = down.

---

## Checklist

- [ ] Heartbeat container running
- [ ] Cloud Run monitor showing green in Kibana Uptime
- [ ] Supabase monitor showing green
- [ ] `heartbeat-*` index appearing in ES

---

---

# Tier 8 — Winlogbeat

Windows event log shipping. Runs on the host Windows machine,
not in Docker. Relevant because production servers are Windows.

Estimated time: 2–3 days.

---

## Install Winlogbeat on Windows

Download from: https://www.elastic.co/downloads/beats/winlogbeat
Extract to `C:\Program Files\Winlogbeat\`

---

## Configure winlogbeat.yml

Edit `C:\Program Files\Winlogbeat\winlogbeat.yml`:

```yaml
winlogbeat.event_logs:

  # Application logs — software errors, warnings
  - name: Application
    ignore_older: 72h

  # System logs — hardware, drivers, services
  - name: System
    ignore_older: 72h

  # Security logs — logins, privilege use, policy changes
  - name: Security
    ignore_older: 72h
    # Filter to key security event IDs only (reduces volume)
    event_id: 4624, 4625, 4634, 4648, 4720, 4722, 4724, 4728
    # 4624 = successful login
    # 4625 = failed login
    # 4634 = logoff
    # 4648 = login with explicit credentials
    # 4720 = user account created
    # 4722 = user account enabled
    # 4724 = password reset attempt
    # 4728 = member added to security group

output.logstash:
  hosts: ["localhost:5044"]

fields:
  source: winlogbeat
  environment: development

logging.level: info
logging.to_files: true
logging.files:
  path: C:\ProgramData\winlogbeat\logs
```

---

## Add a Logstash pipeline for Windows events

Create `infra/logstash/pipeline/winlogbeat.conf`:

```
input {
  beats {
    port => 5045    # separate port from Filebeat to avoid mixing
  }
}

filter {
  if [source] == "winlogbeat" {

    # Tag login events for easy dashboard filtering
    if [winlog][event_id] == 4624 {
      mutate { add_tag => ["login_success"] }
    }
    if [winlog][event_id] == 4625 {
      mutate { add_tag => ["login_failure"] }
    }

    mutate {
      add_field => {
        "event_id"    => "%{[winlog][event_id]}"
        "computer"    => "%{[winlog][computer_name]}"
        "channel"     => "%{[winlog][channel]}"
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "winlogbeat-%{+YYYY.MM.dd}"
  }
}
```

Update `winlogbeat.yml` to use port 5045:
```yaml
output.logstash:
  hosts: ["localhost:5045"]
```

Update docker-compose.yml Logstash ports to expose 5045 too:
```yaml
ports:
  - "5044:5044"
  - "5045:5045"
  - "9600:9600"
```

---

## Install and start Winlogbeat as a Windows service

```powershell
# Run as Administrator
cd "C:\Program Files\Winlogbeat"

# Test config
.\winlogbeat.exe test config -e

# Install as service
.\install-service-winlogbeat.ps1

# Start
Start-Service winlogbeat

# Check status
Get-Service winlogbeat
```

---

## Kibana — Windows events dashboard

Build a panel showing login events over time:

- Data View: `winlogbeat-*`
- Filter: `tags: login_success OR login_failure`
- Horizontal axis: `@timestamp` (date histogram)
- Break down by: tags

This is a simplified version of what production security teams
use to detect brute-force login attempts.

---

## Checklist

- [ ] Winlogbeat installed on Windows host
- [ ] Config test passing
- [ ] Winlogbeat service running
- [ ] `winlogbeat-*` index appearing in ES
- [ ] Security events (login success/failure) visible in Kibana

---

---

# Tier 9 — Auditbeat + Packetbeat (stretch)

Lower priority. Do after spending time on the production project
so you have real context for what these are used for there.

---

## Auditbeat — file integrity + process monitoring

Auditbeat watches for file changes and process activity.
Useful for security compliance — detecting if config files
were modified unexpectedly.

Add to docker-compose.yml:
```yaml
auditbeat:
  image: docker.elastic.co/beats/auditbeat:8.13.0
  container_name: sg-map-auditbeat
  user: root
  pid: host
  cap_add:
    - AUDIT_CONTROL
    - AUDIT_READ
  volumes:
    - ../auditbeat/auditbeat.yml:/usr/share/auditbeat/auditbeat.yml:ro
    - ../../apps/api/src:/watched/api:ro   # watch the API source files
```

Create `infra/auditbeat/auditbeat.yml`:
```yaml
auditbeat.modules:

  - module: file_integrity
    paths:
      - /watched/api           # alert if API source files change
    scan_at_start: true
    scan_rate_per_sec: 50 MiB

  - module: system
    datasets:
      - process    # track process starts/stops
      - user       # track user changes

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "auditbeat-%{+YYYY.MM.dd}"
```

---

## Packetbeat — network traffic analysis

Packetbeat sits on the network interface and records HTTP
transactions between services. Useful for understanding
actual vs expected service communication.

```yaml
packetbeat:
  image: docker.elastic.co/beats/packetbeat:8.13.0
  container_name: sg-map-packetbeat
  user: root
  network_mode: host    # needs host networking to capture packets
  cap_add:
    - NET_ADMIN
    - NET_RAW
  volumes:
    - ../packetbeat/packetbeat.yml:/usr/share/packetbeat/packetbeat.yml:ro
```

Create `infra/packetbeat/packetbeat.yml`:
```yaml
packetbeat.interfaces.device: any

packetbeat.protocols:
  - type: http
    ports: [9200, 5601, 3001]   # ES, Kibana, API
    send_request: true
    send_response: true

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "packetbeat-%{+YYYY.MM.dd}"
```

In Kibana you'll see a breakdown of every HTTP call between
your containers — request latency, response sizes, status codes.

---

## Checklist (Tier 9)

- [ ] Auditbeat running and watching API source files
- [ ] File integrity events visible in `auditbeat-*`
- [ ] Packetbeat capturing HTTP between containers
- [ ] HTTP transaction breakdown visible in Kibana
