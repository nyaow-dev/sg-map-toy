/**
 * Main.js
 * Root viewport. Uses a border layout — the standard ExtJS pattern
 * for dashboard/application UIs.
 *
 * Layout regions:
 *   north  — toolbar (fixed height)
 *   center — OpenLayers map (fills remaining space)
 *   east   — POI grid + search controls (fixed width, collapsible)
 */
Ext.define("SGMapApp.view.main.Main", {
  extend: "Ext.container.Viewport",
  xtype: "app-main",

  requires: [
    "SGMapApp.view.main.MainController",
    "SGMapApp.view.main.MainModel",
    "SGMapApp.view.map.MapPanel",
    "SGMapApp.view.grid.PoiGrid",
  ],

  controller: "main",
  viewModel: { type: "main" },

  layout: "border",

  items: [
    // ── North toolbar ──────────────────────────────────────────
    {
      xtype: "toolbar",
      region: "north",
      height: 48,
      items: [
        {
          xtype: "image",
          src: "resources/icons/default.png",
          width: 24,
          height: 24,
          style: "margin-right:8px",
        },
        {
          xtype: "tbtext",
          html: "<b>SG Map</b> &nbsp;·&nbsp; Bedok Points of Interest",
        },
        "->",
        {
          text: "Add POI",
          iconCls: "x-fa fa-plus",
          ui: "action",
          handler: "onAddPoiClick",
        },
      ],
    },

    // ── Center: map ────────────────────────────────────────────
    {
      xtype: "mappanel",
      region: "center",
      reference: "mapPanel",
    },

    // ── East: grid panel ───────────────────────────────────────
    {
      xtype: "poigrid",
      region: "east",
      reference: "poiGrid",
      width: 380,
      minWidth: 280,
      maxWidth: 600,
      split: true,
      collapsible: true,
      collapseMode: "placeholder",
      animCollapse: false,
    },
  ],
});
