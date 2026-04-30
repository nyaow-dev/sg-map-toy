/**
 * MapPanel.js
 * Wraps an OpenLayers map inside an ExtJS Panel.
 *
 * Why wrap it?  ExtJS manages all layout and sizing via its own box model.
 * OpenLayers needs a plain DOM element as its target. This panel bridges
 * them: it gives OL a div to render into, then synchronises resize events
 * so the map always fills its region correctly.
 *
 * Events fired:
 *   markerclick(mapPanel, poi)   — user clicked a POI marker
 *   mapclick(mapPanel, lat, lng) — user clicked empty map space
 */
Ext.define("SGMapApp.view.map.MapPanel", {
  extend: "Ext.panel.Panel",
  xtype: "mappanel",

  requires: [],

  // Default map centre — Bedok MRT
  centerLat: 1.3241,
  centerLng: 103.93,
  zoom: 14,

  layout: "fit",
  border: false,

  // Internal refs set in initMap()
  olMap: null,
  markerSource: null,
  markerLayer: null,

  // ── Icon map: category → resource path ───────────────────────
  // Add matching PNG files to apps/extjs-app/resources/icons/
  iconMap: {
    hawker: "resources/icons/hawker.png",
    park: "resources/icons/park.png",
    mrt: "resources/icons/mrt.png",
    school: "resources/icons/school.png",
    mall: "resources/icons/mall.png",
    community: "resources/icons/community.png",
    health: "resources/icons/health.png",
    sport: "resources/icons/sport.png",
    landmark: "resources/icons/landmark.png",
    default: "resources/icons/default.png",
  },

  // ── Component initialisation ──────────────────────────────────

  initComponent: function () {
    this.callParent(arguments);
  },

  // ── Lifecycle ─────────────────────────────────────────────────

  afterRender: function () {
    this.callParent(arguments);

    // Wait for the ExtJS border layout to fully calculate dimensions
    // before initialising OpenLayers. boxready fires after first layout pass.
    this.on("boxready", this.initMap, this, { single: true });
  },

  // ── Map initialisation ────────────────────────────────────────

  initMap: function () {
    var me = this;

    me.markerSource = new ol.source.Vector();
    me.markerLayer = new ol.layer.Vector({ source: me.markerSource });

    me.olMap = new ol.Map({
      target: me.getEl().dom,
      layers: [
        new ol.layer.Tile({ source: new ol.source.OSM() }),
        me.markerLayer,
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([me.centerLng, me.centerLat]),
        zoom: me.zoom,
      }),
      // Remove default OL controls (zoom buttons) — cleaner look
      controls: ol.control.defaults.defaults({ zoom: false, rotate: false }),
    });

    // Tell OL to read the actual container size now
    me.olMap.updateSize();

    // Sync again after a brief delay — catches any post-layout adjustments
    Ext.defer(
      function () {
        me.olMap.updateSize();
      },
      200,
      me,
    );

    // Keep map sized correctly when the ExtJS panel resizes
    me.on("resize", function () {
      me.olMap.updateSize();
    });

    // Also handle the east panel collapsing/expanding which triggers a relayout
    me.on("afterlayout", function () {
      me.olMap.updateSize();
    });

    // Wire parent controller events
    var ctrl = me.up("app-main").getController();

    // Pointer cursor over markers
    me.olMap.on("pointermove", function (evt) {
      var hit = me.olMap.hasFeatureAtPixel(evt.pixel);
      me.olMap.getTargetElement().style.cursor = hit ? "pointer" : "";
    });

    // Click: marker or empty space
    me.olMap.on("click", function (evt) {
      var feature = me.olMap.forEachFeatureAtPixel(evt.pixel, function (f) {
        return f;
      });

      if (feature) {
        // Clicked a POI marker
        me.fireEvent("markerclick", me, feature.get("poiData"));
      } else {
        // Clicked empty map
        var lonLat = ol.proj.toLonLat(evt.coordinate);
        me.fireEvent("mapclick", me, lonLat[1], lonLat[0]);
      }
    });

    // Wire events up to the parent controller
    me.on(
      "markerclick",
      me.up("app-main").getController().onMarkerClick,
      me.up("app-main").getController(),
    );
    me.on(
      "mapclick",
      me.up("app-main").getController().onMapClick,
      me.up("app-main").getController(),
    );

    console.log(
      "Map target size:",
      me.getEl().dom.offsetWidth,
      me.getEl().dom.offsetHeight,
    );

    me.fireEvent("mapready", me);
  },

  // ── Public API ────────────────────────────────────────────────

  /**
   * Replace all markers with a new set of POIs.
   * @param {Object[]} pois  Array of { id, name, category, lat, lng }
   */
  loadMarkers: function (pois) {
    var me = this;

    if (!me.markerSource) {
      return;
    }

    me.markerSource.clear();

    pois.forEach(function (poi) {
      if (poi.lat == null || poi.lng == null) return;

      var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([poi.lng, poi.lat])),
        poiData: poi,
      });

      feature.setStyle(me.buildMarkerStyle(poi));
      me.markerSource.addFeature(feature);

      console.log(
        `Map loadMarker[${poi.id}]: (${poi.name}),`,
        poi.lat,
        poi.lng,
      );
    });
  },

  /**
   * Pan the map to a coordinate without changing zoom.
   * @param {number} lat
   * @param {number} lng
   */
  panTo: function (lat, lng) {
    this.olMap.getView().animate({
      center: ol.proj.fromLonLat([lng, lat]),
      duration: 400,
    });
  },

  // ── Internal helpers ──────────────────────────────────────────

  buildMarkerStyle: function (poi) {
    var iconSrc = this.iconMap[poi.category] || this.iconMap["default"];

    return new ol.style.Style({
      image: new ol.style.Icon({
        src: iconSrc,
        scale: 0.6,
        anchor: [0.5, 1], // pin anchors at the bottom-centre of the image
      }),
      text: new ol.style.Text({
        text: poi.name,
        offsetY: -4,
        font: "11px sans-serif",
        fill: new ol.style.Fill({ color: "#222" }),
        stroke: new ol.style.Stroke({ color: "#fff", width: 2 }),
        textAlign: "center",
        textBaseline: "bottom",
      }),
    });
  },
});
