# Tier 4 — Deployment + Eclipse Migration

Deploy the app to free-tier cloud, then optionally migrate to Eclipse.
Estimated time: 3–5 days.

---

## Part A — Deploy the API to Google Cloud Run

Cloud Run is the closest free equivalent to a Tomcat server — it runs
your containerised API and scales to zero when idle (free tier is generous).

### 1. Containerise the API

`apps/api/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
EXPOSE 8080
CMD ["node", "src/index.js"]
```

### 2. Deploy via gcloud CLI

```bash
# Install gcloud CLI from https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy in one step
gcloud run deploy sg-map-api \
  --source apps/api \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "ES_URL=YOUR_ES_URL,SUPABASE_URL=...,SUPABASE_SERVICE_KEY=..."
```

> Note: For Elasticsearch, Cloud Run cannot reach your local Docker instance.
> Options:
> - Use Elastic Cloud free trial (14 days): https://cloud.elastic.co
> - Or keep the API local for now and only deploy the front-end

### 3. Update ExtJS app to point to Cloud Run URL

In `apps/extjs-app/app/store/Pois.js`, replace `localhost:3001` with
the Cloud Run URL that `gcloud run deploy` prints at the end.

---

## Part B — Deploy the front-end to Vercel

### 1. Build the ExtJS app

```bash
cd apps/extjs-app
sencha app build classic
```

Output goes to `build/production/SGMapApp/`.

### 2. Deploy to Vercel

```bash
npm install -g vercel
cd apps/extjs-app/build/production/SGMapApp
vercel deploy --prod
```

Vercel will give you a `*.vercel.app` URL. Done.

---

## Part C — Eclipse migration (optional)

Do this when you have a working app and want to understand the production
tooling. Don't start here — Eclipse adds friction before you have a baseline.

### Why Eclipse for this stack?

The production team uses Eclipse JEE because:
- Sencha Architect has an Eclipse plugin
- Tomcat integration is first-class (server view, hot deploy)
- Java back-end work (if any) fits naturally

### Steps

1. **Install Eclipse JEE 2025**
   Download from: https://www.eclipse.org/downloads/packages/
   Pick "Eclipse IDE for Enterprise Java and Web Developers"

2. **Install the Sencha Eclipse Plugin**
   Eclipse → Help → Eclipse Marketplace → search "Sencha"

3. **Import your existing project**
   File → Import → General → Existing Projects into Workspace
   Point it at `apps/extjs-app/`

4. **Set up Tomcat 9 server**
   - Window → Preferences → Server → Runtime Environments → Add
   - Choose Apache Tomcat 9.0 → point to your Tomcat install
   - Your ExtJS app is static so it can be served from Tomcat's webapps folder

5. **Compare workflows**
   - VS Code: faster iteration, better extensions, sencha app watch
   - Eclipse: integrated server, Sencha Architect visual layout, Java side-by-side
   - Production likely uses Eclipse because the Java back-end lives there too

### Sencha Architect note

Architect is a drag-and-drop visual layout tool for ExtJS. It generates the
same MVC code you've been writing by hand. Learning to write it by hand first
(as this project does) means you understand what Architect generates —
which makes you much more effective debugging it in production.

---

## Tier 4 checklist

- [ ] API running on Cloud Run (or local if ES connectivity is a blocker)
- [ ] Front-end live on Vercel
- [ ] No hardcoded secrets in any committed file
- [ ] (Optional) Eclipse installed with Tomcat configured
- [ ] (Optional) ExtJS project imported and running in Eclipse

**→ Proceed to Tier 5 stretch goals if time remains, or you're ready for production.**
