/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/defined',
        '../Scene/Material',
        '../Scene/ViewportQuad',
        './MaterialProperty'
       ], function(
         AssociativeArray,
         BoundingRectangle,
         Cartesian2,
         defaultValue,
         DeveloperError,
         destroyObject,
         Color,
         defined,
         Material,
         ViewportQuad,
         MaterialProperty) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicScreenOverlay instance
     * in DynamicObject.screenOverlay to a ViewportQuad primitive.
     * @alias ScreenOverlayVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicScreenOverlay
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     */
    var ScreenOverlayVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ScreenOverlayVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._updaters = {};
        this._unusedIndexes = [];
        this._primitives = scene.primitives;
        this._screenOverlayCollection = [];
        this._entityCollection = entityCollection;
        this._entitiesToVisualize = new AssociativeArray();

        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    ScreenOverlayVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entitiesToVisualize.values;
        for (var i = 0, len = entities.length; i < len; i++) {
            this._updateObject(time, entities[i]);
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    ScreenOverlayVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._screenOverlayCollection.length; i < len; i++) {
            this._primitives.remove(this._screenOverlayCollection[i]);
        }

        var entities = this._entitiesToVisualize.values;
        for (i = 0, len = entities.length; i < len; i++) {
            entities[i]._screenOverlayVisualizerIndex = undefined;
        }

        this._unusedIndexes = [];
        this._screenOverlayCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof ScreenOverlayVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ScreenOverlayVisualizer#destroy
     */
    ScreenOverlayVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof ScreenOverlayVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ScreenOverlayVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    ScreenOverlayVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var position;
    var width;
    var height;
    ScreenOverlayVisualizer.prototype._updateObject = function(time, entity) {
        var dynamicScreenOverlay = entity.screenOverlay;
        if (typeof dynamicScreenOverlay === 'undefined') {
            return;
        }

        var positionProperty = dynamicScreenOverlay.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var widthProperty = dynamicScreenOverlay.width;
        if (typeof widthProperty === 'undefined') {
            return;
        }

        var heightProperty = dynamicScreenOverlay.height;
        if (typeof heightProperty === 'undefined') {
            return;
        }


        var screenOverlay;
        var showProperty = dynamicScreenOverlay.show;
        var show = entity.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));
        var screenOverlayVisualizerIndex = entity._screenOverlayVisualizerIndex;

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof screenOverlayVisualizerIndex !== 'undefined') {
                screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
                screenOverlay.show = false;
                entity._screenOverlayVisualizerIndex = undefined;
                this._unusedIndexes.push(screenOverlayVisualizerIndex);
            }
            return;
        }

        if (typeof screenOverlayVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                screenOverlayVisualizerIndex = unusedIndexes.pop();
                screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
            } else {
                screenOverlayVisualizerIndex = this._screenOverlayCollection.length;
                screenOverlay = new ViewportQuad();
                screenOverlay.material = Material.fromType(Material.ColorType);

                this._screenOverlayCollection.push(screenOverlay);
                this._primitives.add(screenOverlay);
            }
            entity._screenOverlayVisualizerIndex = screenOverlayVisualizerIndex;
            screenOverlay.entity = entity;

        } else {
            screenOverlay = this._screenOverlayCollection[screenOverlayVisualizerIndex];
        }


        position = positionProperty.getValue(time, position);
        width = widthProperty.getValue(time, width);
        height = heightProperty.getValue(time, height);

        screenOverlay.show = show;

        if(typeof position !== 'undefined' && typeof width !== 'undefined' && typeof height !== 'undefined') {
            screenOverlay.rectangle = new BoundingRectangle(position.x, position.y, width, height);
        }

        screenOverlay.material = MaterialProperty.getValue(time, dynamicScreenOverlay._material, screenOverlay.material, this._scene.context);
    };

    ScreenOverlayVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var labelCollection = this._labelCollection;
        var unusedIndexes = this._unusedIndexes;
        var entities = this._entitiesToVisualize;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._screenOverlay)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._label) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                this._cleanEntity(entity);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            this._cleanEntity(entity);
            entities.remove(entity.id);
        }
    };

    ScreenOverlayVisualizer.prototype._cleanEntity = function(entity) {
        var thisOverlayCollection = this._screenOverlayCollection;
        var thisUnusedIndexes = this._unusedIndexes;

        var screenOverlayVisualizerIndex = entity._screenOverlayVisualizerIndex;
        if (typeof screenOverlayVisualizerIndex !== 'undefined') {
            var screenOverlay = thisOverlayCollection[screenOverlayVisualizerIndex];
            screenOverlay.show = false;
            thisUnusedIndexes.push(screenOverlayVisualizerIndex);
            entity._screenOverlayVisualizerIndex = undefined;
        }
    };

    return ScreenOverlayVisualizer;
});