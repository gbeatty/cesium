/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/on',
        'dojo/parser',
        'dojo/ready',
        'dijit/form/ToggleButton',
        'DynamicScene/DynamicObjectView',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Scene/CesiumTerrainProvider',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Extent',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Math'
    ], function(
        win,
        domClass,
        ioQuery,
        on,
        parser,
        ready,
        ToggleButton,
        DynamicObjectView,
        Camera,
        CameraFlightPath,
        CesiumTerrainProvider,
        TileMapServiceImageryProvider,
        checkForChromeFrame,
        CesiumViewerWidget,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        Extent,
        JulianDate,
        loadJson,
        CesiumMath) {
    "use strict";
    /*global console*/

    function disableInput(scene) {
        var controller = scene.getScreenSpaceCameraController();
        controller.enableTranslate = false;
        controller.enableZoom = false;
        controller.enableRotate = false;
        controller.enableTilt = false;
        controller.enableLook = false;
    }

    function enableInput(scene) {
        var controller = scene.getScreenSpaceCameraController();
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableRotate = true;
        controller.enableTilt = true;
        controller.enableLook = true;
    }

    function flyToObject(widget, dynamicObject) {
        disableInput(widget.scene);

        var viewFromTo = new DynamicObjectView(dynamicObject, widget.scene, widget.ellipsoid);
        widget._viewFromTo = viewFromTo;


        var cameraFlightPath = CameraFlightPath.createAnimation(
            widget.scene.getFrameState(), {
                destination : new Cartesian3(0, -1000, 600),
                duration : 8000,
                onComplete : function() {
                    widget.centerCameraOnObject(dynamicObject);
                    widget.clock.multiplier = 1.0;
                    widget.clock.shouldAnimate = true;
                    enableInput(widget.scene);
            }
        });
        widget.scene.getAnimations().add(cameraFlightPath);
    }

    var pathObject;
    var clock;
    function updateSpeed() {

        // calculate instantaneous speed
        var currentPosition = pathObject.position.getValueCartesian(clock.currentTime);
        var startPosition = pathObject.position.getValueCartesian(clock.currentTime.addSeconds(-2.0));
        var distance = Cartesian3.distance(currentPosition, startPosition);
        var speed = distance * 1.23694; // m/s -> mph
        speed = Math.round(speed); // round to 2 decimal places

        // calculate slope
        startPosition = pathObject.position.getValueCartographic(clock.currentTime.addSeconds(-2.0));
        currentPosition = pathObject.position.getValueCartographic(clock.currentTime);
        var referencePoint = currentPosition.clone();
        referencePoint.height = startPosition.height;
        startPosition = Ellipsoid.WGS84.cartographicToCartesian(startPosition);
        currentPosition = Ellipsoid.WGS84.cartographicToCartesian(currentPosition);
        referencePoint = Ellipsoid.WGS84.cartographicToCartesian(referencePoint);
        var vec1 = referencePoint.subtract(startPosition);
        var vec2 = currentPosition.subtract(startPosition);
        var slope = CesiumMath.toDegrees(Cartesian3.angleBetween(vec1, vec2));
        slope = Math.round(slope);

        if(speed < 3) {
            slope = '---';
        }

        console.log(speed + " mph  slope = " + slope);
    }

    var slopeLayer;

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        document.addEventListener("videoLoading", function() {
            console.log("loading");
            widget.clock.shouldAnimate = false;
            widget._setLoading(true);
        }, false);

        document.addEventListener("videoLoaded", function() {
            console.log("playing");
            widget.clock.shouldAnimate = true;
            widget._setLoading(false);
        }, false);

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt('cesiumContainer');
        widget.startup();
        widget.fullscreen.viewModel.fullscreenElement(document.body);

        var terrainProvider = new CesiumTerrainProvider({
            url : 'http://cesium.agi.com/srtmplusutah'
        });
        widget.centralBody.terrainProvider = terrainProvider;
        //widget.centralBody.depthTestAgainstTerrain = true;

        var slopeImageryProvider = new TileMapServiceImageryProvider({
            url : 'Gallery/slopeShadeTiles',
            fileExtension: 'png',
            maximumLevel: 15,
            extent: new Extent(
                CesiumMath.toRadians(-111.8393519),
                CesiumMath.toRadians(40.4554630),
                CesiumMath.toRadians(-111.3080556),
                CesiumMath.toRadians(40.7639815))
        });
        var layers = widget.centralBody.getImageryLayers();
        slopeLayer = layers.addImageryProvider(slopeImageryProvider);
        slopeLayer.alpha = 0.6;
        slopeLayer.show = false;

        //var slopeButton = widget.slopeButton;
        slopeButton.set('checked', false);

        on(slopeButton, 'Click', function() {
            if(slopeButton.get('checked')) {
                slopeLayer.show = true;
            }
            else {
                slopeLayer.show = false;
            }
        });

        widget.clock.multiplier = 0.1;

        // hijack object selection
        widget.onObjectSelected = function(selectedObject) {
            if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
                try {
                    var jdate = JulianDate.fromIso8601( selectedObject.dynamicObject.id );
                    widget.clock.currentTime = jdate;
                    console.log("clicked on object " + jdate);
                } catch(e) {
                }
            }
        };


        widget.loadCzml = function(source, lookAt) {
            widget._setLoading(true);
            loadJson(source).then(function(czml) {

                widget.addCzml(czml, source);
                widget._setLoading(false);

                var lookAtObject = widget.dynamicObjectCollection.getObject(lookAt);
                flyToObject(widget, lookAtObject);

                pathObject = lookAtObject;
                clock = widget.clock;
                widget.clock.onTick.addEventListener(updateSpeed);
            },
            function(error) {
                widget._setLoading(false);
                console.error(error);
                window.alert(error);
            });
        };

        widget.setTime = widget.setTimeFromBuffer;
        widget.setTimeFromBuffer = function() {
            widget.setTime();
            widget.clock.multiplier = 1.0;
        };

        widget.loadCzml("Gallery/Alta.czml", "path");

        domClass.remove(win.body(), 'loading');
    });
});