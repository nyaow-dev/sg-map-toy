/**
 * setup-elastic.js
 * Registers the index template and ingest pipeline.
 * Run once before seeding: node scripts/setup-elastic.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ES_URL    = process.env.ES_URL || 'http://localhost:9200';

async function put(path, body) {
  const res = await fetch(`${ES_URL}${path}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('Setting up Elasticsearch...\n');

  // Health check
  const h = await fetch(`${ES_URL}/_cluster/health`).then(r => r.json());
  console.log(`✓ Cluster: ${h.status} (${h.cluster_name})`);

  // Register ingest pipeline
  const pipeline = JSON.parse(
    readFileSync(join(__dirname, '../../../infra/elastic/ingest-pipeline.json'), 'utf8')
  );
  await put('/_ingest/pipeline/sg-poi-pipeline', pipeline);
  console.log('✓ Ingest pipeline registered');

  // Register index template
  const template = JSON.parse(
    readFileSync(join(__dirname, '../../../infra/elastic/index-template.json'), 'utf8')
  );
  await put('/_index_template/sg-pois-template', template);
  console.log('✓ Index template registered');

  console.log('\nDone. Run seed-pois.js next.\n');
}

main().catch(e => { console.error(e.message); process.exit(1); });
