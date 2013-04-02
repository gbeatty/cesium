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
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/processCzml',
        'DynamicScene/VisualizerCollection',
        'Scene/BingMapsImageryProvider',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Scene/CesiumTerrainProvider',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/ClockViewModel',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/CesiumWidget/CesiumWidget',
        'Widgets/Animation/Animation',
        'Widgets/Animation/AnimationViewModel',
        'Widgets/Timeline/Timeline',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Ellipsoid',
        'Core/Extent',
        'Core/Iso8601',
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
        DynamicObjectCollection,
        processCzml,
        VisualizerCollection,
        BingMapsImageryProvider,
        Camera,
        CameraFlightPath,
        CesiumTerrainProvider,
        TileMapServiceImageryProvider,
        ClockViewModel,
        checkForChromeFrame,
        CesiumWidget,
        Animation,
        AnimationViewModel,
        Timeline,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Ellipsoid,
        Extent,
        Iso8601,
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

    function flyToObject(scene, dynamicObject) {
        disableInput(scene);

        dynamicObjectView = new DynamicObjectView(dynamicObject, scene, Ellipsoid.WGS84);

        var cameraFlightPath = CameraFlightPath.createAnimation(
            scene.getFrameState(), {
                destination : new Cartesian3(0, -1000, 600),
                duration : 8000,
                onComplete : function() {
                    enableInput(scene);
            }
        });
        scene.getAnimations().add(cameraFlightPath);
    }

    var pathObject = 'undefined';
    var clock;
    var location;
    var currentTrail;
    var visualizers;
    var dynamicObjectView;
    function updateData() {

        // update czml visualizations
        visualizers.update(clock.currentTime);

        // update the camera position
        if (typeof dynamicObjectView !== 'undefined') {
            dynamicObjectView.update(clock.currentTime);
        }

        if(pathObject !== 'undefined') {

            // calculate instantaneous speed
            var currentPosition = pathObject.position.getValueCartesian(clock.currentTime);
            var startPosition = pathObject.position.getValueCartesian(clock.currentTime.addSeconds(-2.0));
            var distance = Cartesian3.distance(currentPosition, startPosition);
            var speed = distance * 1.23694; // m/s -> mph
            speed = Math.round(speed); // round to 2 decimal places

            // calculate slope
            startPosition = pathObject.position.getValueCartographic(clock.currentTime.addSeconds(-2.0));
            currentPosition = pathObject.position.getValueCartographic(clock.currentTime);
            var altitude = Math.round(currentPosition.height * 3.28084);
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
            else {
                slope += "\u00B0";
            }

            var trailName = ""; //currentTrail.label.text.getValue(clock.currentTime);

            $('#trackingData').html("Location: " + location + "<br>Speed: " + speed + " mph <br>Slope: " + slope +
                    "<br>Altitude: " + altitude + " ft<br>Trail: " + trailName);
        }
    }

    function loadCzml(source, dynamicObjectCollection, lookAt, scene) {
        loadJson(source).then(function(czml) {

            processCzml(czml, dynamicObjectCollection, source);
            setTimeFromBuffer(dynamicObjectCollection);

            if (typeof lookAt !== 'undefined') {
                var lookAtObject = dynamicObjectCollection.getObject(lookAt);
                flyToObject(scene, lookAtObject);
                pathObject = lookAtObject;
            }


        },
        function(error) {
            console.error(error);
            window.alert(error);
        });
    }

    function setTimeFromBuffer(dynamicObjectCollection) {

        var availability = dynamicObjectCollection.computeAvailability();
        if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
            clock.startTime = new JulianDate();
            clock.stopTime = clock.startTime.addDays(1);
            clock.clockRange = ClockRange.UNBOUNDED;
            clock.multiplier = 60.0;
        } else {
            clock.startTime = availability.start;
            clock.stopTime = availability.stop;
        }

        clock.currentTime = clock.startTime;
        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        timelineWidget.zoomTo(clock.startTime, clock.stopTime);
    }

    var slopeLayer;
    $( "#translucencySlider" ).on( "slide", updateLayerTranslucency );
    function updateLayerTranslucency(event, ui) {
        slopeLayer.alpha = ui.value / 100.0;
    }


    var timelineWidget;
    var animationWidget;
    ready(function() {
        parser.parse();

        checkForChromeFrame();

        document.addEventListener("videoLoading", function() {
            widget.clock.shouldAnimate = false;
        }, false);

        document.addEventListener("videoLoaded", function() {
            widget.clock.shouldAnimate = true;
        }, false);

        // initialize the Cesium widget
        var widget = new CesiumWidget('cesiumContainer', {
            terrainProvider : new CesiumTerrainProvider({
                url : 'http://cesium.agi.com/srtmplusutah'
            })
        });
        widget.centralBody.depthTestAgainstTerrain = true;
        clock = widget.clock;
        widget.clock.onTick.addEventListener(updateData);

        // initialize the animation controller
        var clockViewModel = new ClockViewModel(widget.clock);
        clockViewModel.owner = this;
        clockViewModel.shouldAnimate(true);
        var animationViewModel = new AnimationViewModel(clockViewModel);
        animationViewModel.setShuttleRingTicks([0.5, 1, 2, 3, 5, 10, 20, 50, 100]);
        var animationContainer = document.getElementById("animationContainer");
        animationWidget = new Animation(animationContainer, animationViewModel);

        // initialize the timeline
        var timelineContainer = document.getElementById("timelineContainer");
        timelineWidget = new Timeline(timelineContainer, widget.clock);
        timelineWidget.addEventListener('settime',
            function onTimelineScrub(e) {
                widget.clock.currentTime = e.timeJulian;
                widget.clock.shouldAnimate = false;
            }, false);


        /*var slopeImageryProvider = new TileMapServiceImageryProvider({
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
        slopeLayer.alpha = 0.0;
        $( "#translucencySlider" ).slider( "option", "value", 60 );

        //var slopeButton = widget.slopeButton;
        slopeButton.set('checked', false);

        on(slopeButton, 'Click', function() {
            if(slopeButton.get('checked')) {
                //slopeLayer.show = true;
                slopeLayer.alpha = $( "#translucencySlider" ).slider( "value" ) / 100;
                $("#translucencySlider").show("drop", { direction: "up" }, 1000);
                $( "#overlayScale" ).show("slide", { direction: "right" }, 1000);
            }
            else {
                //slopeLayer.show = false;
                slopeLayer.alpha = 0;
                $("#translucencySlider").hide("drop", { direction: "up" }, 1000);
                $( "#overlayScale" ).hide("slide", { direction: "right" }, 1000);
            }
        });*/


/*
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
        };*/



     // load czml
        var dynamicObjectCollection =  new DynamicObjectCollection();
        visualizers = VisualizerCollection.createCzmlStandardCollection(widget.scene, dynamicObjectCollection);

        loadCzml("Gallery/DeerValley.czml", dynamicObjectCollection, "path", widget.scene);
        location = "Deer Valley, UT";

        /*var trailsCzml = "Gallery/DeerValleyTrails.czml";
        loadJson(trailsCzml).then(function(czml) {
            widget.addCzml(czml, trailsCzml);
        });*/

        domClass.remove(win.body(), 'loading');
    });
});