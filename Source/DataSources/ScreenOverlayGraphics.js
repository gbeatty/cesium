/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic ScreenOverlay.
     *
     * @alias ScreenOverlayGraphics
     * @constructor
     */
    var ScreenOverlayGraphics = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._position = undefined;
        this._positionSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;

        this._definitionChanged = new Event();
    };

    defineProperties(ScreenOverlayGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof ScreenOverlayGraphics.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the ScreenOverlay's visibility.
         * @memberof ScreenOverlayGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the screenOverlay.
         * @memberof ScreenOverlayGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createPropertyDescriptor('material'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the screenOverlay.
         * @memberof ScreenOverlayGraphics.prototype
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the screenOverlay.
         * @memberof ScreenOverlayGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the {@link Property} specifying the screen overlay's position on the screen.
         * @memberof ScreenOverlayGraphics.prototype
         * @type {Property}
         */
        position : createPropertyDescriptor('position')
    });

    /**
     * Duplicates a ScreenOverlay instance.
     *
     * @param {ScreenOverlayGraphics} [result] The object onto which to store the result.
     * @returns {ScreenOverlayGraphics} The modified result parameter or a new instance if one was not provided.
     */
    ScreenOverlayGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new ScreenOverlayGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.height = this.height;
        result.width = this.width;
        result.position = this.position;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ScreenOverlayGraphics} source The object to be merged into this object.
     */
    ScreenOverlayGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.height = defaultValue(this.height, source.height);
        this.width = defaultValue(this.width, source.width);
        this.position = defaultValue(this.position, source.position);
    };

    return ScreenOverlayGraphics;
});
