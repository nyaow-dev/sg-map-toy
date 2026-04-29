# Tier 1 — ExtJS App Skeleton + Map

Get a running ExtJS application with an OpenLayers map centred on Bedok,
with hardcoded markers. No backend calls yet — pure front-end proof of concept.

Estimated time: 3–5 days (most of this is getting comfortable with ExtJS concepts).

---

## 1. Install Sencha CMD

Sencha CMD is the build tool for ExtJS projects (equivalent to `vite` or `webpack`
in modern JS stacks, but ExtJS-specific).

Download from: <https://www.sencha.com/products/extjs/cmd-download/>

Install it, then verify:

```bash
sencha which
# Should print the Sencha CMD version
```

---

## 2. Generate the app scaffold

```bash
cd apps/
sencha -sdk ./extjs-app/ext generate app -classic SGMapApp ./extjs-app
```

> If using the CDN path (no local SDK yet), use the template already in
> `apps/extjs-app/` — it loads ExtJS from Sencha's CDN instead.

This generates the standard ExtJS MVC structure:

```text
extjs-app/
├── app/
│   ├── Application.js      ← app entry point
│   ├── model/              ← data models (like C# POCOs)
│   ├── store/              ← data collections (observable lists)
│   ├── view/               ← UI components
│   │   └── main/
│   │       ├── Main.js     ← root viewport
│   │       ├── MainController.js
│   │       └── MainModel.js
├── classic/                ← desktop-specific overrides
├── app.json                ← project config
└── index.html
```

**ExtJS mental model for a C# developer:**

- `Model` ≈ a DTO/POCO with field definitions
- `Store` ≈ an `ObservableCollection<Model>` with built-in pagination and remote loading
- `View` ≈ a UI component class (like a WinForms/WPF control)
- `Controller` ≈ a ViewController — handles events from its View
- `ViewModel` ≈ binds data to the View declaratively

---

## 3. Start the development server

```bash
cd apps/extjs-app
sencha app watch
```

Opens at `http://localhost:1841`. Hot-reloads on file save.

---

## 4. Integrate OpenLayers

OpenLayers is the map library. Add it to `app.json`:

```json
"requires": [],
"js": [
  {
    "path": "https://cdn.jsdelivr.net/npm/ol@9.2.4/dist/ol.js",
    "remote": true
  }
],
"css": [
  {
    "path": "https://cdn.jsdelivr.net/npm/ol@9.2.4/ol.css",
    "remote": true
  }
]
```

---

## 5. Create the MapPanel component

Create `apps/extjs-app/app/view/map/MapPanel.js`:

```javascript
Ext.define('SGMapApp.view.map.MapPanel', {
  extend: 'Ext.panel.Panel',
  xtype: 'mappanel',

  requires: [],

  config: {
    // Bedok, Singapore
    centerLng: 103.9296,
    centerLat: 1.3236,
    zoom: 14
  },

  layout: 'fit',

  // ol.Map lives here after render
  olMap: null,
  markerLayer: null,

  initComponent: function () {
    this.callParent(arguments);
  },

  afterRender: function () {
    this.callParent(arguments);
    this.initMap();
  },

  initMap: function () {
    var me = this;

    // Vector source holds the marker features
    me.markerSource = new ol.source.Vector();
    me.markerLayer = new ol.layer.Vector({
      source: me.markerSource
    });

    me.olMap = new ol.Map({
      target: me.getEl().dom,
      layers: [
        // Base OSM tile layer
        new ol.layer.Tile({
          source: new ol.source.OSM()
        }),
        me.markerLayer
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([me.getCenterLng(), me.getCenterLat()]),
        zoom: me.getZoom()
      })
    });

    // Resize map when panel resizes
    me.on('resize', function () {
      me.olMap.updateSize();
    });
  },

  /**
   * Add markers to the map.
   * @param {Array} pois  Array of { id, name, category, lng, lat }
   */
  loadMarkers: function (pois) {
    var me = this;
    me.markerSource.clear();

    var iconMap = {
      hawker:  'resources/icons/hawker.png',
      park:    'resources/icons/park.png',
      mrt:     'resources/icons/mrt.png',
      default: 'resources/icons/default.png'
    };

    pois.forEach(function (poi) {
      var feature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.fromLonLat([poi.lng, poi.lat])
        ),
        poiData: poi
      });

      feature.setStyle(new ol.style.Style({
        image: new ol.style.Icon({
          src: iconMap[poi.category] || iconMap['default'],
          scale: 0.6
        })
      }));

      me.markerSource.addFeature(feature);
    });
  }
});
```

---

## 6. Wire the MapPanel into Main.js

Replace the content of `app/view/main/Main.js` viewport:

```javascript
Ext.define('SGMapApp.view.main.Main', {
  extend: 'Ext.container.Viewport',
  xtype: 'app-main',

  requires: [
    'SGMapApp.view.main.MainController',
    'SGMapApp.view.main.MainModel',
    'SGMapApp.view.map.MapPanel'
  ],

  controller: 'main',
  viewModel: { type: 'main' },

  layout: 'border',

  items: [
    {
      region: 'north',
      xtype: 'toolbar',
      height: 48,
      items: [
        { xtype: 'tbtext', text: 'SG Map — Bedok POIs' }
      ]
    },
    {
      region: 'center',
      xtype: 'mappanel',
      reference: 'mapPanel'
    },
    {
      region: 'east',
      xtype: 'panel',
      title: 'Points of Interest',
      width: 320,
      layout: 'fit'
      // Grid panel goes here in Tier 2
    }
  ]
});
```

---

## 7. Add hardcoded test markers

In `MainController.js`, add an `onAfterRender` handler:

```javascript
onAfterRender: function () {
  var mapPanel = this.lookupReference('mapPanel');

  // Hardcoded Bedok POIs — replaced with live data in Tier 2
  var testPois = [
    { id: '1', name: 'Bedok Interchange Hawker Centre', category: 'hawker', lng: 103.9296, lat: 1.3240 },
    { id: '2', name: 'Bedok Reservoir Park',            category: 'park',   lng: 103.9280, lat: 1.3374 },
    { id: '3', name: 'Bedok MRT',                      category: 'mrt',    lng: 103.9300, lat: 1.3241 }
  ];

  mapPanel.loadMarkers(testPois);
}
```

And wire the event in Main.js:

```javascript
listeners: {
  afterrender: 'onAfterRender'
}
```

---

## 8. Add placeholder marker icons

Create `apps/extjs-app/resources/icons/` and add four PNG icon files:

- `hawker.png`
- `park.png`
- `mrt.png`
- `default.png`

Use any free icons from <https://icons8.com> or <https://www.flaticon.com> (16–32px PNGs).
The map renders even with broken icon paths — the markers just use a default dot style.

---

## Tier 1 checklist

- [ ] Sencha CMD installed
- [ ] `sencha app watch` runs without errors
- [ ] Map renders centred on Bedok at zoom 14
- [ ] Three hardcoded markers appear with different icons
- [ ] Panel layout (north toolbar, center map, east sidebar) is visible

**→ When all boxes are checked, proceed to `TIER-2-ELASTICSEARCH.md`**

---

## ExtJS concepts to read up on before Tier 2

- **Ext.data.Store** — understand how `proxy`, `reader`, and `autoLoad` work
- **Ext.grid.Panel** — the most-used component in production ExtJS apps
- **ViewModel bindings** — `bind: { store: '{myStore}' }` syntax
- **Component refs** — `reference` + `lookupReference()` for controller access

The official Sencha docs are good: <https://docs.sencha.com/extjs/7.4.0/>
