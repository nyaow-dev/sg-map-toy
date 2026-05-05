/**
 * Pois.js
 * Observable, pageable collection of POI records.
 *
 * Ext.data.Store is the data backbone of ExtJS —
 * components bind to stores, not to raw arrays.
 * Think ObservableCollection<T> + built-in remote paging.
 *
 * The proxy defines how and where data is fetched.
 * extraParams are merged into the query string on every load().
 */
Ext.define("SGMapApp.store.Pois", {
  extend: "Ext.data.Store",
  alias: "store.pois",

  requires: ["SGMapApp.model.Poi"],

  model: "SGMapApp.model.Poi",

  pageSize: 25,

  proxy: {
    type: "ajax",
    url: "http://localhost:3001/api/pois",

    // Default search params — updated by the search toolbar
    extraParams: {
      q: "",
      category: "",
    },

    reader: {
      type: "json",
      rootProperty: "hits", // API returns { hits: [...], total: N }
      totalProperty: "total",
    },
  },

  autoLoad: true,

  listeners: {
    load: "onStoreLoad",
  },

  // Sort locally after load (server returns up to 100 results)
  sorters: [{ property: "name", direction: "ASC" }],
});
