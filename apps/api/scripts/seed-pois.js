/**
 * seed-pois.js
 * Bulk-inserts ~50 real Bedok/East Singapore POIs into Elasticsearch.
 * Run after setup-elastic.js: node scripts/seed-pois.js
 */

const ES_URL = process.env.ES_URL || 'http://localhost:9200';
const INDEX  = 'sg-pois-main';

// Real Bedok and nearby East Singapore POIs with approximate coordinates
const POIS = [
  // Hawker centres
  { name: 'Bedok Interchange Hawker Centre',     category: 'hawker',    address: '209 New Upper Changi Rd, Singapore 460209', lat: 1.3240, lng: 103.9302 },
  { name: 'Bedok North Street 1 Hawker Centre',  category: 'hawker',    address: 'Blk 538 Bedok North St 1, Singapore 460538', lat: 1.3316, lng: 103.9268 },
  { name: 'Fengshan Centre Hawker Centre',        category: 'hawker',    address: '85 Bedok North St 4, Singapore 460085',       lat: 1.3286, lng: 103.9319 },
  { name: 'Simpang Bedok',                        category: 'hawker',    address: '348 Bedok Rd, Singapore 469560',              lat: 1.3177, lng: 103.9270 },
  { name: 'Bedok South Market and Food Centre',   category: 'hawker',    address: '16 Bedok South Rd, Singapore 460016',         lat: 1.3203, lng: 103.9343 },
  { name: 'Kembangan Plaza Food Centre',          category: 'hawker',    address: '18 Jln Masjid, Singapore 418944',             lat: 1.3127, lng: 103.9063 },

  // MRT stations
  { name: 'Bedok MRT Station',                   category: 'mrt',       address: 'New Upper Changi Rd, Singapore 460209',       lat: 1.3241, lng: 103.9300 },
  { name: 'Kembangan MRT Station',               category: 'mrt',       address: 'Jln Kembangan, Singapore 418951',             lat: 1.3214, lng: 103.9121 },
  { name: 'Eunos MRT Station',                   category: 'mrt',       address: 'Sims Ave, Singapore 408787',                  lat: 1.3197, lng: 103.9030 },
  { name: 'Tanah Merah MRT Station',             category: 'mrt',       address: 'New Upper Changi Rd, Singapore 467353',       lat: 1.3273, lng: 103.9463 },
  { name: 'Simei MRT Station',                   category: 'mrt',       address: 'Simei St 3, Singapore 529894',                lat: 1.3432, lng: 103.9532 },

  // Parks and nature
  { name: 'Bedok Reservoir Park',                category: 'park',      address: 'Bedok Reservoir Rd, Singapore 479244',        lat: 1.3373, lng: 103.9286 },
  { name: 'East Coast Park',                     category: 'park',      address: 'East Coast Park Service Rd, Singapore 449876', lat: 1.3008, lng: 103.9190 },
  { name: 'Bedok Town Park',                     category: 'park',      address: '850 New Upper Changi Rd, Singapore 467352',   lat: 1.3275, lng: 103.9433 },
  { name: 'Siglap Park Connector',               category: 'park',      address: 'Siglap Rd, Singapore 455809',                 lat: 1.3088, lng: 103.9245 },
  { name: 'Kembangan Neighbourhood Park',        category: 'park',      address: 'Lengkong Tiga, Singapore 417546',             lat: 1.3160, lng: 103.9109 },

  // Shopping malls
  { name: 'Bedok Mall',                          category: 'mall',      address: '311 New Upper Changi Rd, Singapore 467360',   lat: 1.3247, lng: 103.9300 },
  { name: 'Eastpoint Mall',                      category: 'mall',      address: '3 Simei St 6, Singapore 528833',              lat: 1.3433, lng: 103.9531 },
  { name: 'Changi City Point',                   category: 'mall',      address: '5 Changi Business Park Central 1, Singapore 486038', lat: 1.3344, lng: 103.9641 },
  { name: 'Parkway Parade',                      category: 'mall',      address: '80 Marine Parade Rd, Singapore 449269',       lat: 1.3026, lng: 103.9059 },
  { name: 'Tampines Mall',                       category: 'mall',      address: '4 Tampines Central 5, Singapore 529510',      lat: 1.3527, lng: 103.9454 },

  // Community clubs
  { name: 'Bedok Community Club',                category: 'community', address: '850 New Upper Changi Rd, Singapore 467352',   lat: 1.3265, lng: 103.9418 },
  { name: 'Kembangan-Chai Chee Community Club',  category: 'community', address: '18 Jln Masjid, Singapore 418944',             lat: 1.3130, lng: 103.9068 },
  { name: 'Siglap Community Centre',             category: 'community', address: '10 Siglap Dr, Singapore 456145',              lat: 1.3077, lng: 103.9238 },
  { name: 'Tampines East Community Club',        category: 'community', address: '10 Tampines St 23, Singapore 529341',         lat: 1.3577, lng: 103.9424 },

  // Schools
  { name: 'Bedok South Secondary School',        category: 'school',    address: '10 Bedok South Ave 2, Singapore 469272',      lat: 1.3175, lng: 103.9338 },
  { name: 'Bedok View Secondary School',         category: 'school',    address: '1 Bedok North St 2, Singapore 469644',        lat: 1.3249, lng: 103.9476 },
  { name: 'Anglican High School',                category: 'school',    address: '3 Sorby Adams Dr, Singapore 357691',          lat: 1.3364, lng: 103.9211 },
  { name: 'Temasek Primary School',              category: 'school',    address: '22 Bedok South Ave 1, Singapore 469317',      lat: 1.3167, lng: 103.9352 },
  { name: 'Opera Estate Primary School',         category: 'school',    address: '6 Figaro St, Singapore 458213',               lat: 1.3095, lng: 103.9196 },
  { name: 'Bedok Green Primary School',          category: 'school',    address: '1 Bedok North Ave 4, Singapore 489926',       lat: 1.3339, lng: 103.9346 },

  // Clinics and health
  { name: 'Bedok Polyclinic',                    category: 'health',    address: '11 Bedok North St 1, Singapore 469662',       lat: 1.3254, lng: 103.9461 },
  { name: 'Changi General Hospital',             category: 'health',    address: '2 Simei St 3, Singapore 529889',              lat: 1.3404, lng: 103.9494 },

  // Sport and recreation
  { name: 'Bedok Swimming Complex',              category: 'sport',     address: '10 Bedok North St 2, Singapore 469640',       lat: 1.3253, lng: 103.9472 },
  { name: 'Our Tampines Hub',                    category: 'sport',     address: '1 Tampines Walk, Singapore 528523',           lat: 1.3530, lng: 103.9434 },
  { name: 'East Coast Lagoon Food Village',      category: 'hawker',    address: '1220 East Coast Pkwy, Singapore 468960',      lat: 1.2970, lng: 103.9107 },
  { name: 'Bedok Sport Centre',                  category: 'sport',     address: 'Bedok North Ave 4, Singapore 489961',         lat: 1.3334, lng: 103.9357 },

  // Landmarks
  { name: 'Masjid Khalid',                       category: 'landmark',  address: '130 Joo Chiat Rd, Singapore 427408',          lat: 1.3147, lng: 103.9065 },
  { name: 'Church of the Nativity of the BVM',   category: 'landmark',  address: '1259 Upper Changi Rd N, Singapore 507230',    lat: 1.3442, lng: 103.9636 },
  { name: 'Bedok Town Square',                   category: 'landmark',  address: 'New Upper Changi Rd, Singapore 460208',       lat: 1.3237, lng: 103.9298 },

  // Food streets / enclaves
  { name: 'Joo Chiat Road Heritage Area',        category: 'landmark',  address: 'Joo Chiat Rd, Singapore',                    lat: 1.3135, lng: 103.9032 },
  { name: 'Siglap Village',                      category: 'landmark',  address: 'Siglap Rd, Singapore 455823',                 lat: 1.3089, lng: 103.9254 },
  { name: 'Bedok 85 Fengshan Hawker Centre',     category: 'hawker',    address: '85 Bedok North St 4, Singapore 460085',       lat: 1.3283, lng: 103.9315 }
];

async function main() {
  console.log(`\nConnecting to Elasticsearch at ${ES_URL}...\n`);

  const h = await fetch(`${ES_URL}/_cluster/health`).then(r => r.json());
  console.log(`✓ Cluster: ${h.status}\n`);

  // Delete and recreate index for a clean seed
  await fetch(`${ES_URL}/${INDEX}`, { method: 'DELETE' });

  // Build bulk body
  const body = POIS.flatMap(poi => [
    JSON.stringify({ index: { _index: INDEX } }),
    JSON.stringify({
      ...poi,
      location: { lat: poi.lat, lon: poi.lng },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  ]).join('\n') + '\n';

  const res  = await fetch(`${ES_URL}/_bulk`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body
  });

  const json = await res.json();
  if (json.errors) {
    const failed = json.items.filter(i => i.index?.error);
    console.warn(`⚠ ${failed.length} docs failed:`);
    failed.slice(0, 3).forEach(f => console.warn(' ', JSON.stringify(f.index.error)));
  }

  // Force refresh
  await fetch(`${ES_URL}/${INDEX}/_refresh`, { method: 'POST' });

  const count = await fetch(`${ES_URL}/${INDEX}/_count`).then(r => r.json());
  console.log(`✓ ${count.count} POIs indexed into ${INDEX}`);
  console.log('\nOpen Kibana at http://localhost:5601 to explore.\n');
}

main().catch(e => { console.error(e.message); process.exit(1); });
