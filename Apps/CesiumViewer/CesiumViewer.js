/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'DynamicScene/DynamicObjectView',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Scene/CesiumTerrainProvider',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Extent',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Math'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        DynamicObjectView,
        Camera,
        CameraFlightPath,
        CesiumTerrainProvider,
        TileMapServiceImageryProvider,
        checkForChromeFrame,
        CesiumViewerWidget,
        Cartesian3,
        Cartographic,
        Extent,
        JulianDate,
        loadJson,
        Math) {
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

    function updateSpeed() {
        console.log("time");
    }

    var slopeImageryProvider = new TileMapServiceImageryProvider({
        url : 'Gallery/slopeShade',
        fileExtension: 'jpg',
        maximumLevel: 15,
        extent: new Extent(
            Math.toRadians(-112.0005556),
            Math.toRadians(39.9994444),
            Math.toRadians(-110.9994444),
            Math.toRadians(41.0005556))
    });

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

        var layers = widget.centralBody.getImageryLayers();
        //var newLayer = layers.addImageryProvider(slopeImageryProvider);
        //newLayer.alpha = 0.3;

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