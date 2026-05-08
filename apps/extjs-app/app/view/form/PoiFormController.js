/**
 * PoiFormController.js
 * Handles form submission for the PoiForm window.
 * Determines create vs update from the presence of an id field value.
 */
Ext.define("SGMapApp.view.form.PoiFormController", {
  extend: "Ext.app.ViewController",
  alias: "controller.poiform",

  onSave: function () {
    var me = this;
    var form = me.lookupReference("form").getForm();

    if (!form.isValid()) return;

    // Find and disable the Save button immediately
    var saveBtn = me.getView().down("button[handler=onSave]");
    saveBtn.setDisabled(true);
    saveBtn.setText("Saving...");

    var values = form.getValues();
    var isEdit = !!values.id;

    var apiBase = window.APP_CONFIG
      ? window.APP_CONFIG.apiBase
      : "http://localhost:3001";

    Ext.Ajax.request({
      url: apiBase + "/api/pois" + (isEdit ? "/" + values.id : ""),
      method: isEdit ? "PUT" : "POST",
      jsonData: {
        name: values.name,
        category: values.category,
        description: values.description || "",
        address: values.address || "",
        lat: parseFloat(values.lat),
        lng: parseFloat(values.lng),
      },
      success: function () {
        me.getView().fireEvent("poisaved");
        me.getView().close();
      },
      failure: function (response) {
        var msg = "Save failed";
        try {
          var body = Ext.decode(response.responseText);
          msg += ": " + (body.error || response.statusText);
        } catch (e) {
          msg += ": " + response.statusText;
        }
        Ext.Msg.alert("Error", msg);
      },
    });
  },

  onCancel: function () {
    this.getView().close();
  },
});
