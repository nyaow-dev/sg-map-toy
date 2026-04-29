/**
 * MainController.js
 * Handles all cross-component coordination:
 *   - Store loads → sync map markers
 *   - Map marker click → highlight grid row
 *   - Grid row select → pan map to marker
 *   - Add / Edit / Delete → open form, reload store
 */
Ext.define("SGMapApp.view.main.MainController", {
  extend: "Ext.app.ViewController",
  alias: "controller.main",

  requires: ["SGMapApp.view.form.PoiForm"],

  // ── Lifecycle ─────────────────────────────────────────────────

  init: function () {
    var me = this;

    // Listen for store load to sync map
    var store = me.getViewModel().getStore("pois");
    store.on("load", me.onStoreLoad, me);
  },

  // ── Store → Map sync ──────────────────────────────────────────

  /**
   * Called every time the Pois store finishes loading.
   * Converts store records to plain objects and hands them to the map.
   */
  onStoreLoad: function (store, records) {
    var mapPanel = this.lookupReference("mapPanel");

    // Guard: map may not be rendered yet if store loads before afterRender
    if (!mapPanel || !mapPanel.olMap) return;

    var pois = (records || []).map(function (r) {
      return r.getData();
    });
    mapPanel.loadMarkers(pois);
  },

  // ── Map events ────────────────────────────────────────────────

  /**
   * User clicked a map marker.
   * Finds the matching record in the grid and selects it.
   */
  onMarkerClick: function (mapPanel, poi) {
    var grid = this.lookupReference("poiGrid");
    var store = grid.getStore();
    var rec = store.findRecord("id", poi.id);
    if (rec) {
      grid.getSelectionModel().select(rec);
      grid.getView().focusRow(rec);
    }
  },

  /**
   * User clicked empty map space — open a new POI form
   * pre-filled with the clicked coordinates.
   */
  onMapClick: function (mapPanel, lat, lng) {
    this.openPoiForm(null, lat, lng);
  },

  // ── Grid events ───────────────────────────────────────────────

  /**
   * User selected a grid row — pan the map to that POI.
   */
  onGridSelect: function (selModel, record) {
    var mapPanel = this.lookupReference("mapPanel");
    if (mapPanel && record.get("lat") && record.get("lng")) {
      mapPanel.panTo(record.get("lat"), record.get("lng"));
    }
  },

  /**
   * Search field changed — reload store with new query param.
   */
  onSearchChange: function (field, value) {
    var store = this.getViewModel().getStore("pois");
    store.getProxy().setExtraParam("q", value || "");
    store.loadPage(1);
  },

  /**
   * Category combo changed — reload store with category filter.
   */
  onCategoryChange: function (combo, value) {
    var store = this.getViewModel().getStore("pois");
    store.getProxy().setExtraParam("category", value || "");
    store.loadPage(1);
  },

  /**
   * Category combo cleared.
   */
  onCategoryClear: function () {
    var store = this.getViewModel().getStore("pois");
    store.getProxy().setExtraParam("category", "");
    store.loadPage(1);
  },

  // ── Toolbar button ────────────────────────────────────────────

  onAddPoiClick: function () {
    this.openPoiForm(null, null, null);
  },

  // ── Grid action column handlers ───────────────────────────────

  onEditPoi: function (grid, rowIndex) {
    var record = grid.getStore().getAt(rowIndex);
    this.openPoiForm(record, null, null);
  },

  onDeletePoi: function (grid, rowIndex) {
    var me = this;
    var record = grid.getStore().getAt(rowIndex);

    Ext.Msg.confirm(
      "Delete POI",
      "Delete <b>" + record.get("name") + "</b>? This cannot be undone.",
      function (btn) {
        if (btn !== "yes") return;

        Ext.Ajax.request({
          url: "http://localhost:3001/api/pois/" + record.get("id"),
          method: "DELETE",
          success: function () {
            me.reloadStore();
            Ext.toast({ html: "POI deleted", align: "br" });
          },
          failure: function (resp) {
            Ext.Msg.alert("Error", "Delete failed: " + resp.statusText);
          },
        });
      },
    );
  },

  // ── Form helpers ──────────────────────────────────────────────

  openPoiForm: function (record, lat, lng) {
    var me = this;
    var win = Ext.create("SGMapApp.view.form.PoiForm");

    if (record) {
      // Editing existing record
      win.setTitle("Edit POI");
      win.down("form").getForm().setValues(record.getData());
    } else {
      // New record — pre-fill coordinates if provided
      win.setTitle("Add POI");
      if (lat != null) win.down("[name=lat]").setValue(lat.toFixed(6));
      if (lng != null) win.down("[name=lng]").setValue(lng.toFixed(6));
    }

    win.on("poisaved", me.onPoiSaved, me, { single: true });
    win.show();
  },

  onPoiSaved: function () {
    this.reloadStore();
    Ext.toast({ html: "POI saved", align: "br" });
  },

  reloadStore: function () {
    this.getViewModel().getStore("pois").reload();
  },
});
