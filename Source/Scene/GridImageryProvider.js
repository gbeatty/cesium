/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Color',
        '../Core/Event',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        defineProperties,
        Color,
        Event,
        GeographicTilingScheme) {
    "use strict";

    /**
     * An {@link ImageryProvider} that draws a wireframe grid on every tile with controllable background and glow.
     * May be useful for custom rendering effects or debugging terrain.
     *
     * @alias GridImageryProvider
     * @constructor
     *
     * @param {TilingScheme} [description.tilingScheme=new GeographicTilingScheme()] The tiling scheme for which to draw tiles.
     * @param {Number} [description.cells=8] The number of grids cells.
     * @param {Color} [description.color=Color(1.0, 1.0, 1.0, 0.4)] The color to draw grid lines.
     * @param {Color} [description.glowColor=Color(0.0, 1.0, 0.0, 0.05)] The color to draw glow for grid lines.
     * @param {Number} [description.glowWidth=6] The width of lines used for rendering the line glow effect.
     * @param {Color} [backgroundColor=Color(0.0, 0.5, 0.0, 0.2)] Background fill color.
     * @param {Number} [description.tileWidth=256] The width of the tile for level-of-detail selection purposes.
     * @param {Number} [description.tileHeight=256] The height of the tile for level-of-detail selection purposes.
     * @param {Number} [description.canvasSize=256] The size of the canvas used for rendering.
     */
    var GridImageryProvider = function GridImageryProvider(description) {
        description = defaultValue(description, {});

        this._tilingScheme = defaultValue(description.tilingScheme, new GeographicTilingScheme());
        this._cells = defaultValue(description.cells, 8);
        this._color = defaultValue(description.color, new Color(1.0, 1.0, 1.0, 0.4));
        this._glowColor = defaultValue(description.glowColor, new Color(0.0, 1.0, 0.0, 0.05));
        this._glowWidth = defaultValue(description.glowWidth, 6);
        this._backgroundColor = defaultValue(description.backgroundColor, new Color(0.0, 0.5, 0.0, 0.2));
        this._errorEvent = new Event();

        this._tileWidth = defaultValue(description.tileWidth, 256);
        this._tileHeight = defaultValue(description.tileHeight, 256);

        // A little larger than tile size so lines are sharper
        // Note: can't be too much difference otherwise texture blowout
        this._canvasSize = defaultValue(description.canvasSize, 256);

        // We only need a single canvas since all tiles will be the same
        this._canvas = this._createGridCanvas();
    };

    defineProperties(GridImageryProvider.prototype, {
        /**
         * Gets the proxy used by this provider.
         * @memberof GridImageryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         */
        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         */
        tileHeight: {
            get : function() {
                return this._tileHeight;
            }
        },


        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets the extent, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {Extent}
         */
        extent : {
            get : function() {
                return this._tilingScheme.extent;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link GridImageryProvider#ready} returns true.
         * @memberof GridImageryProvider.prototype
         * @type {TileDiscardPolicy}
         */
        tileDiscardPolicy : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof GridImageryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof GridImageryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return true;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link GridImageryProvider#ready} returns true.
         * @type {Credit}
         */
        credit : {
            get : function() {
                return undefined;
            }
        }
    });

    /**
     * Draws a grid of lines into a canvas.
     *
     * @memberof GridImageryProvider
     */
    GridImageryProvider.prototype._drawGrid = function(context) {
        var minPixel = 0;
        var maxPixel = this._canvasSize;
        for( var x = 0; x <= this._cells; ++x ){
            var nx = x / this._cells;
            var val = 1 + nx * (maxPixel-1);

            context.moveTo(val, minPixel);
            context.lineTo(val, maxPixel);
            context.moveTo(minPixel, val);
            context.lineTo(maxPixel, val);
        }
        context.stroke();
    };

    /**
     * Render a grid into a canvas with background and glow
     *
     * @memberof GridImageryProvider
     */
    GridImageryProvider.prototype._createGridCanvas = function() {
        var canvas = document.createElement('canvas');
        canvas.width = this._canvasSize;
        canvas.height = this._canvasSize;
        var minPixel = 0;
        var maxPixel = this._canvasSize;

        var context = canvas.getContext('2d');

        // Fill the background
        var cssBackgroundColor = this._backgroundColor.toCssColorString();
        context.fillStyle = cssBackgroundColor;
        context.fillRect(minPixel, minPixel, maxPixel, maxPixel);

        // Glow for grid lines
        var cssGlowColor = this._glowColor.toCssColorString();
        context.strokeStyle = cssGlowColor;
        // Wide
        context.lineWidth = this._glowWidth;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        this._drawGrid(context);
        // Narrow
        context.lineWidth = this._glowWidth * 0.5;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        this._drawGrid(context);


        // Grid lines
        var cssColor = this._color.toCssColorString();
        // Border
        context.strokeStyle = cssColor;
        context.lineWidth = 2;
        context.strokeRect(minPixel, minPixel, maxPixel, maxPixel);
        // Inner
        context.lineWidth = 1;
        this._drawGrid(context);

        return canvas;
    };

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @memberof GridImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    GridImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link GridImageryProvider#ready} returns true.
     *
     * @memberof GridImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    GridImageryProvider.prototype.requestImage = function(x, y, level) {
        return this._canvas;
    };


    return GridImageryProvider;
});
