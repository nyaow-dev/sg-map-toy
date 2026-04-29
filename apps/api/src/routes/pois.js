import { Router }   from 'express';
import { esClient, ES_INDEX } from '../lib/elastic.js';
import { supabase }           from '../lib/supabase.js';

export const router = Router();

// ------------------------------------------------------------------
// GET /api/pois
// Query params: q (text search), category, radius_km, lat, lng
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { q, category, radius_km, lat, lng } = req.query;

  const must    = [];
  const filters = [];

  // Full-text search across name, description, address
  if (q) {
    must.push({
      multi_match: {
        query:  q,
        fields: ['name^3', 'description', 'address']
      }
    });
  }

  // Exact category filter
  if (category) {
    filters.push({ term: { category } });
  }

  // Geo distance filter
  if (radius_km && lat && lng) {
    filters.push({
      geo_distance: {
        distance: `${radius_km}km`,
        location: { lat: parseFloat(lat), lon: parseFloat(lng) }
      }
    });
  }

  try {
    const result = await esClient.search({
      index: ES_INDEX,
      body: {
        size: 100,
        query: {
          bool: {
            must:   must.length   ? must   : [{ match_all: {} }],
            filter: filters
          }
        },
        sort: must.length
          ? ['_score']                                      // relevance when text searching
          : [{ 'name.keyword': 'asc' }]                    // alphabetical otherwise
      }
    });

    const hits  = result.hits.hits.map(h => ({ id: h._id, ...h._source }));
    const total = result.hits.total.value;

    res.json({ hits, total });
  } catch (err) {
    console.error('ES search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// POST /api/pois  — create (dual-write: Supabase then ES)
// ------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { name, category, description, address, lat, lng } = req.body;

  if (!name || !category || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, category, lat, lng are required' });
  }

  // 1. Write to Supabase (source of truth)
  const { data, error } = await supabase
    .from('pois')
    .insert({
      name, category, description, address,
      location: `POINT(${lng} ${lat})`   // PostGIS WKT: lon before lat
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Sync to Elasticsearch
  try {
    await esClient.index({
      index:    ES_INDEX,
      id:        data.id,
      document: {
        name, category, description, address,
        lat:      parseFloat(lat),
        lng:      parseFloat(lng),
        location: { lat: parseFloat(lat), lon: parseFloat(lng) },
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    });
  } catch (esErr) {
    // Supabase write succeeded — log ES failure but don't fail the request.
    // In production you'd push to a retry queue here.
    console.error('ES index error (Supabase write succeeded):', esErr.message);
  }

  res.status(201).json({ id: data.id, ...data });
});

// ------------------------------------------------------------------
// PUT /api/pois/:id  — update
// ------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, description, address, lat, lng } = req.body;

  // 1. Update Supabase
  const { data, error } = await supabase
    .from('pois')
    .update({
      name, category, description, address,
      location:   `POINT(${lng} ${lat})`,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Update Elasticsearch
  try {
    await esClient.update({
      index: ES_INDEX,
      id,
      doc: {
        name, category, description, address,
        lat:      parseFloat(lat),
        lng:      parseFloat(lng),
        location: { lat: parseFloat(lat), lon: parseFloat(lng) },
        updated_at: data.updated_at
      }
    });
  } catch (esErr) {
    console.error('ES update error:', esErr.message);
  }

  res.json({ id, ...data });
});

// ------------------------------------------------------------------
// DELETE /api/pois/:id
// ------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // 1. Delete from Supabase
  const { error } = await supabase.from('pois').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  // 2. Delete from Elasticsearch
  try {
    await esClient.delete({ index: ES_INDEX, id });
  } catch (esErr) {
    console.error('ES delete error:', esErr.message);
  }

  res.status(204).send();
});
