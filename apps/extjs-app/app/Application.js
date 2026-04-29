/**
 * Application.js
 * Entry point for the SGMapApp ExtJS application.
 * Ext.application() is the equivalent of a program's main() —
 * it boots the framework and launches the root view.
 */
Ext.define("SGMapApp.Application", {
  extend: "Ext.app.Application",
  name: "SGMapApp",

  launch: function () {
    console.log("SGMapApp launch() called");
  },
});
