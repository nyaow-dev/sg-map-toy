# Tier 2 — Elasticsearch Data Layer + Grid

Wire real data from Elasticsearch into the ExtJS Grid and map markers.
Estimated time: 4–6 days.

---

## 1. Register the ES index template

Run from `apps/api/`:
```bash
node scripts/setup-elastic.js
```

This registers:
- **Index template** for `sg-pois-*` with geo_point field, keyword/text split fields
- **Ingest pipeline** that normalises category and validates coordinates

---

## 2. Seed Bedok POI data

```bash
node scripts/seed-pois.js
```

Inserts ~50 real Bedok POIs: hawker centres, MRT stations, parks, schools,
community clubs, and shopping centres with actual coordinates.

Verify in Kibana Dev Tools:
```
GET sg-pois-main/_count
GET sg-pois-main/_search
{ "size": 3, "sort": [{ "name.keyword": "asc" }] }
```

---

## 3. Start the API

```bash
cd apps/api
npm run dev
```

Endpoints:
- `GET  /api/pois?q=&category=&radius_km=` — search POIs from ES
- `POST /api/pois` — create (writes to ES + Supabase in Tier 3)
- `PUT  /api/pois/:id` — update
- `DELETE /api/pois/:id` — delete

Test with Thunder Client or curl:
```bash
curl "http://localhost:3001/api/pois?category=hawker"
curl "http://localhost:3001/api/pois?q=bedok"
```

---

## 4. Add the ExtJS Grid panel

Create `apps/extjs-app/app/view/grid/PoiGrid.js`:

```javascript
Ext.define('SGMapApp.view.grid.PoiGrid', {
  extend: 'Ext.grid.Panel',
  xtype: 'poigrid',

  requires: ['SGMapApp.store.Pois'],

  title: 'Points of Interest',
  store: { type: 'pois' },

  columns: [
    { text: 'Name',     dataIndex: 'name',     flex: 2 },
    { text: 'Category', dataIndex: 'category', flex: 1 },
    { text: 'Address',  dataIndex: 'address',  flex: 2 },
    {
      text: 'Actions', width: 80, xtype: 'actioncolumn',
      items: [
        {
          iconCls: 'x-fa fa-pencil',
          tooltip: 'Edit',
          handler: 'onEditPoi'
        },
        {
          iconCls: 'x-fa fa-trash',
          tooltip: 'Delete',
          handler: 'onDeletePoi'
        }
      ]
    }
  ],

  tbar: [
    {
      xtype: 'textfield',
      reference: 'searchField',
      emptyText: 'Search POIs...',
      width: 200,
      listeners: { change: 'onSearchChange' }
    },
    {
      xtype: 'combobox',
      reference: 'categoryFilter',
      emptyText: 'All categories',
      store: ['hawker', 'park', 'mrt', 'school', 'mall', 'community'],
      listeners: { select: 'onCategoryChange' }
    },
    '-',
    { text: 'Add POI', iconCls: 'x-fa fa-plus', handler: 'onAddPoi' }
  ]
});
```

---

## 5. Create the Pois Store

Create `apps/extjs-app/app/store/Pois.js`:

```javascript
Ext.define('SGMapApp.store.Pois', {
  extend: 'Ext.data.Store',
  alias: 'store.pois',

  requires: ['SGMapApp.model.Poi'],

  model: 'SGMapApp.model.Poi',

  proxy: {
    type: 'ajax',
    url: 'http://localhost:3001/api/pois',
    reader: {
      type: 'json',
      rootProperty: 'hits',     // API returns { hits: [...], total: N }
      totalProperty: 'total'
    }
  },

  autoLoad: true,
  pageSize: 25,

  listeners: {
    load: 'onStoreLoad'
  }
});
```

---

## 6. Create the Poi Model

Create `apps/extjs-app/app/model/Poi.js`:

```javascript
Ext.define('SGMapApp.model.Poi', {
  extend: 'Ext.data.Model',

  fields: [
    { name: 'id',          type: 'string' },
    { name: 'name',        type: 'string' },
    { name: 'category',    type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'address',     type: 'string' },
    { name: 'lat',         type: 'float' },
    { name: 'lng',         type: 'float' }
  ]
});
```

---

## 7. Wire grid into layout + sync map

Update `MainController.js` to:
- Reload map markers whenever the store loads
- Select a grid row when a map marker is clicked

```javascript
// Called when store loads — sync markers to grid data
onStoreLoad: function (store, records) {
  var mapPanel = this.lookupReference('mapPanel');
  var pois = records.map(function (r) { return r.getData(); });
  mapPanel.loadMarkers(pois);
},

onSearchChange: function (field, value) {
  var store = this.getViewModel().getStore('pois');
  store.getProxy().setExtraParam('q', value);
  store.load();
},

onCategoryChange: function (combo, record) {
  var store = this.getViewModel().getStore('pois');
  store.getProxy().setExtraParam('category', record.get('field1'));
  store.load();
}
```

---

## ES query reference (Kibana Dev Tools)

Verify your data and test queries that the API uses:

```
# Full text search
GET sg-pois-main/_search
{ "query": { "match": { "name": "hawker" } } }

# Category filter
GET sg-pois-main/_search
{ "query": { "term": { "category": "park" } } }

# Geo distance — POIs within 1km of Bedok MRT
GET sg-pois-main/_search
{
  "query": {
    "geo_distance": {
      "distance": "1km",
      "location": { "lat": 1.3241, "lon": 103.9300 }
    }
  }
}

# Aggregation — count by category
GET sg-pois-main/_search
{
  "size": 0,
  "aggs": { "by_category": { "terms": { "field": "category" } } }
}
```

---

## Tier 2 checklist

- [ ] `node scripts/setup-elastic.js` runs cleanly
- [ ] `node scripts/seed-pois.js` inserts ~50 documents
- [ ] `GET /api/pois` returns JSON with real data
- [ ] `GET /api/pois?category=hawker` filters correctly
- [ ] Grid panel renders with real POI rows
- [ ] Map markers update when grid loads
- [ ] Search field triggers a new ES query and refreshes both grid and map

**→ When all boxes are checked, proceed to `TIER-3-CRUD-SUPABASE.md`**
