/**
 * PoiGrid.js
 * Grid panel displaying POIs from the Pois store.
 *
 * Ext.grid.Panel is one of the most important components in any
 * production ExtJS app — it is data-bound, pageable, sortable,
 * and filterable out of the box.
 *
 * The store is inherited from the parent ViewModel (no proxy defined here).
 */
Ext.define("SGMapApp.view.grid.PoiGrid", {
  extend: "Ext.grid.Panel",
  xtype: "poigrid",

  requires: [],

  title: "Points of Interest",
  border: false,

  // Bind to the 'pois' store declared in MainModel
  bind: { store: "{pois}" },

  // ── Column definitions ────────────────────────────────────────
  columns: [
    {
      text: "Name",
      dataIndex: "name",
      flex: 2,
      renderer: function (val, meta) {
        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(val) + '"';
        return val;
      },
    },
    {
      text: "Category",
      dataIndex: "category",
      width: 90,
      renderer: function (val) {
        // Capitalise first letter
        return val ? val.charAt(0).toUpperCase() + val.slice(1) : "";
      },
    },
    {
      text: "Address",
      dataIndex: "address",
      flex: 2,
      hidden: true, // hidden by default, user can show via column menu
    },
    {
      text: "Actions",
      xtype: "actioncolumn",
      width: 60,
      items: [
        {
          iconCls: "x-fa fa-pencil",
          tooltip: "Edit",
          handler: "onEditPoi",
        },
        {
          iconCls: "x-fa fa-trash",
          tooltip: "Delete",
          handler: "onDeletePoi",
        },
      ],
    },
  ],

  // ── Top toolbar: search + category filter ─────────────────────
  tbar: {
    overflowHandler: "scroller",
    items: [
      {
        xtype: "textfield",
        emptyText: "Search POIs...",
        width: 160,
        enableKeyEvents: true,
        listeners: {
          change: { fn: "onSearchChange", buffer: 400 },
        },
      },
      {
        xtype: "combobox",
        emptyText: "All categories",
        width: 130,
        store: [
          "hawker",
          "park",
          "mrt",
          "school",
          "mall",
          "community",
          "health",
          "sport",
          "landmark",
        ],
        listeners: {
          select: function (combo, record) {
            // Extract plain string value before passing to controller
            var val = combo.getValue();
            combo.up("app-main").getController().onCategoryChange(combo, val);
          },
          change: function (combo, val) {
            if (!val) {
              combo.up("app-main").getController().onCategoryClear();
            }
          },
        },
      },
      "-",
      { text: "Add POI", iconCls: "x-fa fa-plus", handler: "onAddPoi" },
    ],
  },

  // ── Bottom paging toolbar ─────────────────────────────────────
  bbar: {
    xtype: "pagingtoolbar",
    displayInfo: true,
    displayMsg: "{0}–{1} of {2} POIs",
    emptyMsg: "No POIs found",
  },

  // ── Row selection → pan map ───────────────────────────────────
  listeners: {
    selectionchange: function (selModel, records) {
      if (records.length) {
        this.up("app-main").getController().onGridSelect(selModel, records[0]);
      }
    },
  },

  // ── Config ────────────────────────────────────────────────────
  selModel: {
    selType: "rowmodel",
    mode: "SINGLE",
  },

  viewConfig: {
    stripeRows: true,
    emptyText:
      '<div style="padding:16px;color:#888">No POIs found.<br>Try a different search or add one.</div>',
    deferEmptyText: false,
  },
});
