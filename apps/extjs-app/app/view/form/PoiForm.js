/**
 * PoiForm.js
 * Modal window containing a form for creating and editing POIs.
 *
 * Fired events:
 *   poisaved — after a successful save; parent controller reloads the store
 */
Ext.define("SGMapApp.view.form.PoiForm", {
  extend: "Ext.window.Window",
  xtype: "poiform",

  requires: ["SGMapApp.view.form.PoiFormController"],

  controller: "poiform",

  title: "Add / Edit POI",
  modal: true,
  width: 480,
  resizable: false,
  layout: "fit",
  closable: true,

  items: [
    {
      xtype: "form",
      reference: "form",
      bodyPadding: 20,
      defaults: {
        anchor: "100%",
        labelWidth: 100,
        labelAlign: "right",
      },
      items: [
        // Hidden id field — populated when editing an existing record
        { xtype: "hiddenfield", name: "id" },

        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          allowBlank: false,
          maxLength: 200,
        },
        {
          xtype: "combobox",
          name: "category",
          fieldLabel: "Category",
          allowBlank: false,
          forceSelection: true,
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
          queryMode: "local",
        },
        {
          xtype: "textareafield",
          name: "description",
          fieldLabel: "Description",
          rows: 3,
        },
        {
          xtype: "textfield",
          name: "address",
          fieldLabel: "Address",
        },
        {
          xtype: "fieldcontainer",
          fieldLabel: "Coordinates",
          layout: "hbox",
          items: [
            {
              xtype: "numberfield",
              name: "lat",
              emptyText: "Latitude",
              flex: 1,
              allowBlank: false,
              decimalPrecision: 6,
              minValue: 1.1,
              maxValue: 1.5,
              // Singapore bounding box — prevents obviously wrong entries
              invalidText: "Must be between 1.1 and 1.5 (Singapore)",
            },
            { xtype: "tbspacer", width: 8 },
            {
              xtype: "numberfield",
              name: "lng",
              emptyText: "Longitude",
              flex: 1,
              allowBlank: false,
              decimalPrecision: 6,
              minValue: 103.5,
              maxValue: 104.1,
              invalidText: "Must be between 103.5 and 104.1 (Singapore)",
            },
          ],
        },
        {
          // Hint: remind the user they can click the map to fill coords
          xtype: "displayfield",
          value:
            '<span style="color:#888;font-size:11px">💡 Tip: close this window and click the map to pre-fill coordinates</span>',
        },
      ],
    },
  ],

  buttons: [
    {
      text: "Cancel",
      handler: "onCancel",
    },
    {
      text: "Save",
    //   ui: "action",
      formBind: true, // disabled until all required fields are valid
      handler: "onSave",
    },
  ],
});
