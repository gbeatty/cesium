/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Scene/CesiumTerrainProvider',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget',
        'Core/JulianDate'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        Camera,
        CameraFlightPath,
        CesiumTerrainProvider,
        checkForChromeFrame,
        CesiumViewerWidget,
        JulianDate) {
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

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

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

        widget.clock.multiplier = 0.1;

        widget.onObjectSelected = function(selectedObject) {
            if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
                try {
                    var jdate = JulianDate.fromIso8601( selectedObject.dynamicObject.id );
                    widget.clock.currentTime = jdate;
                    console.log("clicked on object " + jdate);
                } catch(e) {
                    disableInput(widget.scene);
                    var flight = CameraFlightPath.createAnimation(widget.scene.getFrameState(), {
                        destination : selectedObject._actualPosition,
                        onComplete : function() {
                            enableInput(widget.scene);
                        }
                    });
                    widget.scene.getAnimations().add(flight);
                }
            }
        };

        widget.setTime = widget.setTimeFromBuffer;
        widget.setTimeFromBuffer = function() {
            widget.setTime();
            widget.clock.multiplier = 1;
        };

        widget.loadCzml("Gallery/deerValleyTest.czml", "path");

        domClass.remove(win.body(), 'loading');
    });
});