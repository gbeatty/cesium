/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/on',
        'dojo/parser',
        'dojo/ready',
        'dijit/form/ToggleButton',
        'DynamicScene/CompositeDynamicObjectCollection',
        'DynamicScene/DynamicObjectView',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/processCzml',
        'DynamicScene/VisualizerCollection',
        'Scene/Billboard',
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
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Ellipsoid',
        'Core/Extent',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Core/Transforms',
        'ThirdParty/knockout',
        'ThirdParty/Tween'
    ], function(
        win,
        domClass,
        ioQuery,
        on,
        parser,
        ready,
        ToggleButton,
        CompositeDynamicObjectCollection,
        DynamicObjectView,
        DynamicObjectCollection,
        processCzml,
        VisualizerCollection,
        Billboard,
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
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Ellipsoid,
        Extent,
        Iso8601,
        JulianDate,
        loadJson,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Transforms,
        knockout,
        Tween) {
    "use strict";
    /*global console*/

    function setLoading(isLoading) {
        document.getElementById("loading").style.display = isLoading ? 'block' : 'none';
    }

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

        dynamicObjectView = new DynamicObjectView(dynamicObject, scene);
        dynamicObjectView.update(cesiumWidget.clock.currentTime);

        var cameraFlightPath = CameraFlightPath.createAnimation(
            scene.getFrameState(), {
                destination : new Cartesian3(0, -1000, 600),
                duration : 12000,
                onComplete : function() {
                    enableInput(scene);
            }
        });
        scene.getAnimations().add(cameraFlightPath);
    }

    function createQuaternion(direction, up) {
        var right = direction.cross(up);
        up = right.cross(direction);
        var viewMat = new Matrix3( right.x,      right.y,      right.z,
                                   up.x,         up.y,         up.z,
                                  -direction.x, -direction.y, -direction.z);
        return Quaternion.fromRotationMatrix(viewMat);
    }

    var transitionInProgress = false;
    function flyToTime(jdate) {
        if(transitionInProgress) {
            return;
        }

        transitionInProgress = true;
        disableInput(cesiumWidget.scene);
        cesiumWidget.clock.shouldAnimate = false;

        var camera = cesiumWidget.scene.getCamera();
        var initialCameraPositionENU = camera.position;
        var initialCameraPositionWC = camera.getPositionWC();
        var initialObjectPositionWC = pathObject.position.getValueCartesian(cesiumWidget.clock.currentTime);

        var cameraOffsetWC = initialCameraPositionWC.subtract(initialObjectPositionWC);
        cameraOffsetWC = cameraOffsetWC.normalize().multiplyByScalar(75);
        var finalCameraPositionENU = initialCameraPositionENU.normalize().multiplyByScalar(75);
        var finalObjectPositionWC = pathObject.position.getValueCartesian(jdate);
        var finalCameraPositionWC = finalObjectPositionWC.add(cameraOffsetWC);

        var finalDirection = cameraOffsetWC.negate().normalize();
        var finalRight = finalDirection.cross(finalObjectPositionWC).normalize();
        var finalUp = finalRight.cross(finalDirection).normalize();
        var finalRefFrame = Transforms.eastNorthUpToFixedFrame(finalObjectPositionWC);
        var finalOffsetENU = Matrix4.getRotation(finalRefFrame).multiplyByVector(cameraOffsetWC);

        var initialOrientation = createQuaternion(camera.getDirectionWC(), camera.getUpWC());
        var finalOrientation = createQuaternion(finalDirection, finalUp);

        // put the camera in world coordinate ref frame
        camera.position = camera.getPositionWC();
        camera.direction = Cartesian3.fromCartesian4(camera.getDirectionWC());
        camera.up = Cartesian3.fromCartesian4(camera.getUpWC());
        camera.right = Cartesian3.fromCartesian4(camera.getRightWC());
        camera.transform = Matrix4.IDENTITY.clone();


        var updateCamera = function(value) {
            var time = value.time;
            var orientation = Quaternion.slerp(initialOrientation, finalOrientation, time);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = Cartesian3.lerp(initialCameraPositionWC, finalCameraPositionWC, time);
            camera.right = rotationMatrix.getRow(0);
            camera.up = rotationMatrix.getRow(1);
            camera.direction = rotationMatrix.getRow(2).negate();
        };

        var duration = 3000;
        var animation =
            {
                duration : duration,
                easingFunction : Tween.Easing.Sinusoidal.InOut,
                startValue : {
                    time : 0.0
                },
                stopValue : {
                    time : 1.0
                },
                onUpdate : updateCamera,
                onComplete : function() {
                    camera.transform = finalRefFrame;
                    camera.position = finalCameraPositionENU;
                    camera.direction = camera.position.negate().normalize();
                    camera.right = camera.direction.cross(Cartesian3.UNIT_Z).normalize();
                    camera.up = camera.right.cross(camera.direction).normalize();
                    enableInput(cesiumWidget.scene);
                    cesiumWidget.clock.shouldAnimate = true;
                    cesiumWidget.clock.currentTime = jdate;
                    transitionInProgress = false;
                }
            };

        cesiumWidget.scene.getAnimations().add(animation);

    }

    var pathObject = 'undefined';
    var location;
    var currentTrail = 'undefined';
    var pathVisualizers = 'undefined';
    var trailsVisualizers = 'undefined';
    var dynamicObjectView;

    function updateData() {

        if(cesiumWidget.clock.shouldAnimate === false){
            return;
        }

        var clock = cesiumWidget.clock;

        // update czml visualizations
        if(pathVisualizers !== 'undefined') {
            pathVisualizers.update(clock.currentTime);
        }
        if(trailsVisualizers !== 'undefined') {
            trailsVisualizers.update(clock.currentTime);
        }

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

            var trailName = (currentTrail !== 'undefined' ? currentTrail.label.text.getValue(clock.currentTime) : "");

            $('#trackingData').html("Location: " + location + "<br>Speed: " + speed + " mph <br>Slope: " + slope +
                    "<br>Altitude: " + altitude + " ft<br>Trail: " + trailName);
        }
    }

    function setTimeFromBuffer(dynamicObjectCollection) {

        var clock = cesiumWidget.clock;

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

        animationWidget.viewModel.startTime = clock.startTime;
        animationWidget.viewModel.stopTime = clock.stopTime;
    }

    function _handleLeftClick(e) {

        var selectedObject = cesiumWidget.scene.pick(e.position);

        if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
            try {
                var jdate = JulianDate.fromIso8601( selectedObject.dynamicObject.id );
                flyToTime(jdate);
            } catch(e) {
            }
        }
    }

    var slopeLayer;
    $( "#translucencySlider" ).on( "slide", updateLayerTranslucency );
    function updateLayerTranslucency(event, ui) {
        slopeLayer.alpha = ui.value / 100.0;
    }


    var timelineWidget;
    var animationWidget;
    var cesiumWidget;
    var trailMapCzml;
    ready(function() {
        setLoading(true);

        parser.parse();

        //checkForChromeFrame();

        var isChrome = window.chrome;
        if(!isChrome) {
            $('#errorDialog').dialog("open");
            return;
        }

        // help dialog
        $('#helpDialog').dialog("open");

        document.addEventListener("videoLoading", function() {
            cesiumWidget.clock.shouldAnimate = false;
            setLoading(true);
        }, false);

        document.addEventListener("videoLoaded", function() {
            cesiumWidget.clock.shouldAnimate = true;
            setLoading(false);
        }, false);

        // initialize the Cesium widget
        cesiumWidget = new CesiumWidget('cesiumContainer', {
            terrainProvider : new CesiumTerrainProvider({
                url : 'http://cesium.agi.com/srtmplusutah'
            })
        });
        cesiumWidget.centralBody.depthTestAgainstTerrain = true;
        cesiumWidget.clock.onTick.addEventListener(updateData);

        cesiumWidget.centralBody.logoOffset = new Cartesian2(300, 30);

        // initialize the animation controller
        var clockViewModel = new ClockViewModel(cesiumWidget.clock);
        clockViewModel.owner = this;
        clockViewModel.shouldAnimate(true);
        clockViewModel.clockRange(ClockRange.LOOP_STOP);
        var animationViewModel = new AnimationViewModel(clockViewModel);
        animationViewModel.snapToTicks = knockout.observable(true);
        animationViewModel.setShuttleRingTicks([0.0, 0.5, 1, 2, 3, 5, 10, 20, 50, 100]);
        var animationContainer = document.getElementById("animationContainer");
        animationWidget = new Animation(animationContainer, animationViewModel);

        // initialize the timeline
        var timelineContainer = document.getElementById("timelineContainer");
        timelineWidget = new Timeline(timelineContainer, cesiumWidget.clock);
        timelineWidget.addEventListener('settime',
            function onTimelineScrub(e) {
                cesiumWidget.clock.currentTime = e.timeJulian;
                cesiumWidget.clock.shouldAnimate = true;
            }, false
        );


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
        var layers = cesiumWidget.centralBody.getImageryLayers();
        slopeLayer = layers.addImageryProvider(slopeImageryProvider);
        slopeLayer.show = false;
        slopeLayer.alpha = 0.6;
        $( "#translucencySlider" ).slider( "option", "value", 60 );

        var slopeButton = document.getElementById("slopeOverlayButton");
        slopeButton.onclick = function() {
            if(slopeLayer.show === false) {
                slopeLayer.show = true;
                //slopeLayer.alpha = $( "#translucencySlider" ).slider( "value" ) / 100;
                $("#translucencySlider").show("drop", { direction: "up" }, 1000);
                $( "#overlayScale" ).show("slide", { direction: "right" }, 1000);
            }
            else {
                slopeLayer.show = false;
                //slopeLayer.alpha = 0;
                $("#translucencySlider").hide("drop", { direction: "up" }, 1000);
                $( "#overlayScale" ).hide("slide", { direction: "right" }, 1000);
            }
        };


        var handler = new ScreenSpaceEventHandler(cesiumWidget.scene._canvas);
        handler.setInputAction(_handleLeftClick, ScreenSpaceEventType.LEFT_CLICK);

        var animation;
        var animatingBillboard;
        var updateAnimation = function(value) {
            animatingBillboard.setScale(value.scale);
        };

        var animationComplete = function() {
            animation = undefined;
            animatingBillboard.highlighted = true;
        };

        var finalAnimationComplete = function() {
            animation = undefined;
            animatingBillboard.highlighted = false;
            animatingBillboard = undefined;
        };

        // If the mouse is over the billboard, change its scale
        handler.setInputAction(function (movement) {
            var scene = cesiumWidget.scene;
            var pickedObject = scene.pick(movement.endPosition);
            if(animatingBillboard === undefined &&
                pickedObject instanceof Billboard &&
                pickedObject.dynamicObject.id !== "path" &&
                !pickedObject.highlighted) {

                // on enter
                animatingBillboard = pickedObject;
                animation = animation || scene.getAnimations().add({
                    onUpdate : updateAnimation,
                    onComplete : animationComplete,
                    startValue : {
                        scale : animatingBillboard.getScale()
                    },
                    stopValue : {
                        scale : 1.5
                    },
                    duration : 200,
                    easingFunction : Tween.Easing.Quartic.Out
                });
            }
            else if (animatingBillboard !== undefined &&
                    pickedObject !== animatingBillboard &&
                    animatingBillboard.highlighted) {
                // on exit
                animation = animation || scene.getAnimations().add({
                    onUpdate : updateAnimation,
                    onComplete : finalAnimationComplete,
                    startValue : {
                        scale : animatingBillboard.getScale()
                    },
                    stopValue : {
                        scale : 1.0
                    },
                    duration : 200,
                    easingFunction : Tween.Easing.Quartic.Out
                });
            }

        },
        ScreenSpaceEventType.MOUSE_MOVE);




        var pathCzml = "Gallery/DeerValley.czml";
        var trailsCzml = "Gallery/DeerValleyTrails.czml";
        location = "Deer Valley, UT";

        // load path czml
        loadJson(pathCzml).then(function(czml) {

            var dynamicObjectCollection =  new DynamicObjectCollection();
            processCzml(czml, dynamicObjectCollection, pathCzml);
            setTimeFromBuffer(dynamicObjectCollection);

            // set the camera to follow the path
            var lookAtObject = dynamicObjectCollection.getObject("path");
            flyToObject(cesiumWidget.scene, lookAtObject);
            pathObject = lookAtObject;

            // get the current trail object
            currentTrail = dynamicObjectCollection.getObject("CurrentTrail");

            pathVisualizers = VisualizerCollection.createCzmlStandardCollection(cesiumWidget.scene, dynamicObjectCollection);
            setLoading(false);
        });

        // load trails
        loadJson(trailsCzml).then(function(czml) {

            trailMapCzml =  new DynamicObjectCollection();
            processCzml(czml, trailMapCzml, trailsCzml);
            trailsVisualizers = VisualizerCollection.createCzmlStandardCollection(cesiumWidget.scene, trailMapCzml);
        });

        domClass.remove(win.body(), 'loading');
    });
});