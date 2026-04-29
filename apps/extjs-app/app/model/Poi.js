/**
 * Poi.js
 * Data model for a Point of Interest.
 *
 * Ext.data.Model is roughly equivalent to a typed DTO.
 * Fields define types, defaults, and conversion functions.
 * The model is used by the Store and by form field binding.
 */
Ext.define('SGMapApp.model.Poi', {
    extend: 'Ext.data.Model',

    fields: [
        { name: 'id',          type: 'string' },
        { name: 'name',        type: 'string' },
        { name: 'category',    type: 'string' },
        { name: 'description', type: 'string', defaultValue: '' },
        { name: 'address',     type: 'string', defaultValue: '' },
        { name: 'lat',         type: 'float' },
        { name: 'lng',         type: 'float' },
        { name: 'created_at',  type: 'date',   dateFormat: 'c' },
        { name: 'updated_at',  type: 'date',   dateFormat: 'c' }
    ]
});
