# Tier 3 — CRUD Form + Supabase Dual-Write

Add a form panel for creating and editing POIs, writing to both
Elasticsearch (search index) and Supabase/PostGIS (source of truth).

Estimated time: 4–5 days.

---

## Why dual-write?

In production, PostGIS is the authoritative store (spatial queries,
relational joins, data integrity). Elasticsearch is the search index
(fast full-text, aggregations, Kibana dashboards). Changes write to
both; if ES goes down, data is safe in Postgres.

This is the pattern your production team uses. Getting it right here
means you understand the data flow before you touch production code.

---

## 1. Add the Form panel

Create `apps/extjs-app/app/view/form/PoiForm.js`:

```javascript
Ext.define('SGMapApp.view.form.PoiForm', {
  extend: 'Ext.window.Window',
  xtype: 'poiform',

  requires: ['SGMapApp.view.form.PoiFormController'],
  controller: 'poiform',

  title: 'Add / Edit POI',
  modal: true,
  width: 480,
  layout: 'fit',
  closable: true,

  items: [{
    xtype: 'form',
    reference: 'form',
    bodyPadding: 16,
    defaults: { anchor: '100%', labelWidth: 100 },
    items: [
      { xtype: 'hiddenfield', name: 'id' },
      {
        xtype: 'textfield', name: 'name',
        fieldLabel: 'Name', allowBlank: false
      },
      {
        xtype: 'combobox', name: 'category',
        fieldLabel: 'Category', allowBlank: false,
        store: ['hawker', 'park', 'mrt', 'school', 'mall', 'community'],
        forceSelection: true
      },
      {
        xtype: 'textareafield', name: 'description',
        fieldLabel: 'Description', rows: 3
      },
      {
        xtype: 'textfield', name: 'address',
        fieldLabel: 'Address'
      },
      {
        xtype: 'numberfield', name: 'lat',
        fieldLabel: 'Latitude', allowBlank: false,
        decimalPrecision: 6,
        minValue: 1.1, maxValue: 1.5   // Singapore bounding box
      },
      {
        xtype: 'numberfield', name: 'lng',
        fieldLabel: 'Longitude', allowBlank: false,
        decimalPrecision: 6,
        minValue: 103.5, maxValue: 104.1
      }
    ]
  }],

  buttons: [
    { text: 'Cancel', handler: 'onCancel' },
    { text: 'Save',   handler: 'onSave', formBind: true, ui: 'action' }
  ]
});
```

---

## 2. Form controller

Create `apps/extjs-app/app/view/form/PoiFormController.js`:

```javascript
Ext.define('SGMapApp.view.form.PoiFormController', {
  extend: 'Ext.app.ViewController',
  alias: 'controller.poiform',

  onSave: function () {
    var me = this;
    var form = me.lookupReference('form').getForm();

    if (!form.isValid()) return;

    var values = form.getValues();
    var isEdit  = !!values.id;
    var url     = isEdit
      ? 'http://localhost:3001/api/pois/' + values.id
      : 'http://localhost:3001/api/pois';

    Ext.Ajax.request({
      url:    url,
      method: isEdit ? 'PUT' : 'POST',
      jsonData: values,
      success: function () {
        me.getView().close();
        // Notify parent to reload store
        me.fireEvent('poisaved');
      },
      failure: function (response) {
        Ext.Msg.alert('Error', 'Save failed: ' + response.statusText);
      }
    });
  },

  onCancel: function () {
    this.getView().close();
  }
});
```

---

## 3. Update the API for dual-write

The API now writes to Supabase first (source of truth), then syncs to ES.
If the ES write fails, the Supabase record is kept and can be re-indexed.

Key pattern in `apps/api/src/routes/pois.js`:
```javascript
// POST /api/pois
router.post('/', async (req, res) => {
  const poi = req.body;

  // 1. Write to Supabase (source of truth)
  const { data, error } = await supabase
    .from('pois')
    .insert({
      name:        poi.name,
      category:    poi.category,
      description: poi.description,
      address:     poi.address,
      location:    `POINT(${poi.lng} ${poi.lat})`  // WKT format for PostGIS
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Sync to Elasticsearch
  await esClient.index({
    index:    'sg-pois-main',
    id:        data.id,
    document: {
      ...poi,
      location: { lat: poi.lat, lon: poi.lng },  // ES geo_point format
      created_at: data.created_at
    }
  });

  res.status(201).json(data);
});
```

---

## 4. Map click → pre-fill lat/lng in form

Add a click handler to MapPanel that fires when the user clicks an empty
map area — pre-fills lat/lng in the form so they don't type coordinates:

```javascript
// In MapPanel.initMap()
me.olMap.on('click', function (evt) {
  var lonLat = ol.proj.toLonLat(evt.coordinate);
  me.fireEvent('maplclick', me, lonLat[1], lonLat[0]);
});
```

In MainController:
```javascript
// Listen for map click and forward to open form
'mappanel': {
  mapclick: 'onMapClick'
},

onMapClick: function (mapPanel, lat, lng) {
  this.openPoiForm(null, lat, lng);
},

openPoiForm: function (record, lat, lng) {
  var win = Ext.create('SGMapApp.view.form.PoiForm');
  win.on('poisaved', this.onPoiSaved, this);
  if (record) win.lookupReference('form').getForm().setValues(record.getData());
  if (lat)    win.lookupReference('form').getForm().findField('lat').setValue(lat.toFixed(6));
  if (lng)    win.lookupReference('form').getForm().findField('lng').setValue(lng.toFixed(6));
  win.show();
}
```

---

## Tier 3 checklist

- [ ] Form window opens from "Add POI" button and from grid Edit action
- [ ] Clicking empty map space pre-fills lat/lng in the form
- [ ] Saving a new POI writes to Supabase — verify in Supabase Table Editor
- [ ] Saving a new POI also appears in `GET sg-pois-main/_search` in Kibana
- [ ] Editing an existing POI updates both Supabase and ES
- [ ] Deleting a POI removes it from both stores
- [ ] Grid and map refresh after every save/delete

**→ When all boxes are checked, proceed to `TIER-4-DEPLOY-ECLIPSE.md`**
