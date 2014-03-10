/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        './createDynamicPropertyDescriptor',
        './ConstantProperty',
        './Property'
    ], function(
        defined,
        defineProperties,
        Event,
        createDynamicPropertyDescriptor,
        ConstantProperty,
        Property) {
    "use strict";

    /**
     * A {@link MaterialProperty} that maps to video {@link Material} uniforms.
     * @alias VideoMaterialProperty
     * @constructor
     */
    var VideoMaterialProperty = function() {
        this._definitionChanged = new Event();
        this._video = undefined;
        this._videoSubscription = undefined;
        this._horizontalRepeat = undefined;
        this._horizontalRepeatSubscription = undefined;
        this._verticalRepeat = undefined;
        this._verticalRepeatSubscription = undefined;
        this._startTime = undefined;
        this._startTimeSubscription = undefined;
        this._loop = undefined;
        this._loopSubscription = undefined;
        this._speed = undefined;
        this._speedSubscription = undefined;
    };

    defineProperties(VideoMaterialProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof VideoMaterialProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._video) && Property.isConstant(this._horizontalRepeat) &&
                    Property.isConstant(this._verticalRepeat) && Property.isConstant(this._startTime) &&
                    Property.isConstant(this._loop) && Property.isConstant(this.speed);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof VideoMaterialProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets or sets the string property which is the url of the desired video.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        video : createDynamicPropertyDescriptor('video'),

        /**
         * Gets or sets the numeric property which determines the number of times the image repeats in the horizontal direction.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        horizontalRepeat : createDynamicPropertyDescriptor('horizontalRepeat'),

        /**
         * Gets or sets the numeric property which determines the number of times the image repeats in the vertical direction.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        verticalRepeat : createDynamicPropertyDescriptor('horizontalRepeat'),

        /**
         * Gets or sets the boolean property which determines if the video loops back to the beginning when it reaches the end.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        loop : createDynamicPropertyDescriptor('loop'),

        /**
         * Gets or sets the numeric property which determines how fast the video plays.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        speed : createDynamicPropertyDescriptor('speed'),

        /**
         * Gets or sets the time property which determines when the video begins playing.
         * @memberof VideoMaterialProperty.prototype
         * @type {Property}
         */
        startTime : createDynamicPropertyDescriptor('startTime')
    });

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    VideoMaterialProperty.prototype.getType = function(time) {
        return 'Video';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    VideoMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};
        }

        result.video = defined(this._video) ? this._video.getValue(time) : undefined;
        result.horizontalRepeat = defined(this._horizontalRepeat) ? this._horizontalRepeat.getValue(time) : undefined;
        result.verticalRepeat = defined(this._verticalRepeat) ? this._verticalRepeat.getValue(time) : undefined;
        result.loop = defined(this._loop) ? this._loop.getValue(time) : undefined;
        result.speed = defined(this._speed) ? this._speed.getValue(time) : undefined;
        result.startTime = defined(this._startTime) ? this._startTime.getValue(time) : undefined;
        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ImageMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    VideoMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof VideoMaterialProperty && //
                Property.equals(this._video, other._video) && //
                Property.equals(this._horizontalRepeat, other._horizontalRepeat) && //
                Property.equals(this._verticalRepeat, other._verticalRepeat) && //
                Property.equals(this._loop, other._loop) && //
                Property.equals(this._speed, other._speed) && //
                Property.equals(this._startTime, other._startTime));
    };

    /**
     * @private
     */
    VideoMaterialProperty.prototype._raiseDefinitionChanged = function(){
        this._definitionChanged.raiseEvent(this);
    };

    return VideoMaterialProperty;
});
