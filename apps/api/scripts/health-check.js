/**
 * health-check.js
 * Verify ES and Supabase are reachable before starting development.
 * Usage: node scripts/health-check.js
 */

import 'dotenv/config';

const ES_URL        = process.env.ES_URL        || 'http://localhost:9200';
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;

let allOk = true;

function ok(msg)   { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); allOk = false; }

// Check Elasticsearch
try {
  const res  = await fetch(`${ES_URL}/_cluster/health`);
  const data = await res.json();
  if (data.status === 'red') {
    fail(`Elasticsearch cluster status is RED`);
  } else {
    ok(`Elasticsearch: ${data.status} (${data.cluster_name})`);
  }
} catch (e) {
  fail(`Elasticsearch unreachable at ${ES_URL} — is Docker running? (${e.message})`);
}

// Check Supabase
if (!SUPABASE_URL || !SUPABASE_KEY) {
  fail('SUPABASE_URL or SUPABASE_SERVICE_KEY missing from .env');
} else {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pois?limit=1`, {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      ok('Supabase: connected (pois table accessible)');
    } else {
      const body = await res.text();
      if (body.includes('does not exist')) {
        fail('Supabase connected but pois table not found — run the CREATE TABLE SQL from TIER-0-SETUP.md');
      } else {
        fail(`Supabase returned ${res.status}: ${body.slice(0, 120)}`);
      }
    }
  } catch (e) {
    fail(`Supabase unreachable: ${e.message}`);
  }
}

// Check PostGIS
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/postgis_version`,
      {
        method:  'POST',
        headers: {
          apikey:          SUPABASE_KEY,
          Authorization:   `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json'
        },
        body: '{}'
      }
    );
    if (res.ok) {
      const version = await res.json();
      ok(`PostGIS: enabled (${version})`);
    } else {
      fail('PostGIS extension not enabled — run: CREATE EXTENSION IF NOT EXISTS postgis;');
    }
  } catch (e) {
    fail(`PostGIS check failed: ${e.message}`);
  }
}

console.log('');
if (allOk) {
  console.log('✓ Environment ready. Proceed with Tier 1.\n');
} else {
  console.log('✗ Some checks failed — fix the above before continuing.\n');
  process.exit(1);
}
