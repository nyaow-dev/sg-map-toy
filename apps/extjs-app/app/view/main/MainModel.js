/**
 * MainModel.js
 * ViewModel for the Main viewport.
 *
 * Stores declared here are automatically instantiated and available
 * to the view via bind: and to the controller via getViewModel().getStore().
 *
 * Think of the ViewModel as the "state" object for the view hierarchy —
 * similar to a React context or a WPF DataContext.
 */
Ext.define('SGMapApp.view.main.MainModel', {
    extend: 'Ext.app.ViewModel',
    alias:  'viewmodel.main',

    requires: [
        'SGMapApp.store.Pois'
    ],

    stores: {
        pois: {
            type:     'pois',
            autoLoad: true
        }
    },

    data: {
        appTitle: 'SG Map — Bedok POIs'
    }
});
