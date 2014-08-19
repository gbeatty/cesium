/*global define*/
define([
        'DataSources/EntityView',
        'DataSources/EntityCollection',
        'DataSources/CzmlDataSource',
        'DataSources/DataSourceDisplay',
        'DataSources/DataSourceCollection',
        'DataSources/Entity',
        'Scene/Billboard',
        'Scene/BingMapsImageryProvider',
        'Scene/Camera',
        'Scene/CameraFlightPath',
        'Core/CesiumTerrainProvider',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/ClockViewModel',
        'Widgets/CesiumWidget/CesiumWidget',
        'Widgets/Animation/Animation',
        'Widgets/Animation/AnimationViewModel',
        'Widgets/Timeline/Timeline',
        'Widgets/FullscreenButton/FullscreenButton',
        'Core/BingMapsApi',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Rectangle',
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
        EntityView,
        EntityCollection,
        CzmlDataSource,
        DataSourceDisplay,
        DataSourceCollection,
        Entity,
        Billboard,
        BingMapsImageryProvider,
        Camera,
        CameraFlightPath,
        CesiumTerrainProvider,
        TileMapServiceImageryProvider,
        ClockViewModel,
        CesiumWidget,
        Animation,
        AnimationViewModel,
        Timeline,
        FullscreenButton,
        BingMapsApi,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        defined,
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
        var controller = scene.screenSpaceCameraController;
        controller.enableInputs = false;
    }

    function enableInput(scene) {
        var controller = scene.screenSpaceCameraController;
        controller.enableInputs = true;
    }

    function flyToObject(scene, entity) {
        disableInput(scene);

        var time = cesiumWidget.clock.currentTime;

        entityView = new EntityView(entity, scene);
        entityView.update(time);

        var objectPosition = entity.position.getValue(time);
        var cameraOffset = new Cartesian3(0, -1000, 100);
        var direction = new Cartesian3();
        Cartesian3.negate(Cartesian3.normalize(cameraOffset, direction), direction);

        var up = new Cartesian3();
        Cartesian3.cross(direction, objectPosition, up);
        Cartesian3.cross(up, direction, up);
        Cartesian3.normalize(up, up);

        var destination = new Cartesian3();
        Cartesian3.add(objectPosition, cameraOffset, destination);

        scene.camera.flyTo({
            destination : destination,
            direction : direction,
            up : up,
            duration : 12.0,
            complete : function() {
                enableInput(scene);
            }
        });
    }

    function createQuaternion(direction, up) {
        var right = new Cartesian3();
        Cartesian3.cross(direction, up, right);

        Cartesian3.cross(right, direction, up);
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

        var camera = cesiumWidget.scene.camera;
        var initialCameraPositionENU = Cartesian3.clone(camera.position);
        var initialCameraPositionWC = Cartesian3.clone(camera.positionWC);
        var initialObjectPositionWC = pathObject.position.getValue(cesiumWidget.clock.currentTime);

        var cameraOffsetWC = new Cartesian3();
        Cartesian3.subtract(initialCameraPositionWC, initialObjectPositionWC, cameraOffsetWC);
        Cartesian3.multiplyByScalar(Cartesian3.normalize(cameraOffsetWC, cameraOffsetWC), 75, cameraOffsetWC);

        var finalCameraPositionENU = new Cartesian3();
        Cartesian3.multiplyByScalar(Cartesian3.normalize(initialCameraPositionENU, finalCameraPositionENU), 75, finalCameraPositionENU);

        var finalObjectPositionWC = pathObject.position.getValue(jdate);

        var finalCameraPositionWC = new Cartesian3();
        Cartesian3.add(finalObjectPositionWC, cameraOffsetWC, finalCameraPositionWC);

        var finalDirection = new Cartesian3();
        Cartesian3.normalize(Cartesian3.negate(cameraOffsetWC, finalDirection), finalDirection);

        var finalRight = new Cartesian3();
        Cartesian3.normalize(Cartesian3.cross(finalDirection, finalObjectPositionWC, finalRight), finalRight);

        var finalUp = new Cartesian3();
        Cartesian3.normalize(Cartesian3.cross(finalRight, finalDirection, finalUp), finalUp);

        var finalRefFrame = Transforms.eastNorthUpToFixedFrame(finalObjectPositionWC);
        var finalOffsetENU = new Matrix4();
        Matrix4.multiplyByVector(Matrix4.getRotation(finalRefFrame, finalOffsetENU), cameraOffsetWC, finalOffsetENU);

        var initialOrientation = createQuaternion(camera.directionWC, camera.upWC);
        var finalOrientation = createQuaternion(finalDirection, finalUp);


        camera.setTransform(Matrix4.IDENTITY);


        var updateCamera = function(value) {
            var time = value.time;
            var orientation = new Quaternion();
            Quaternion.slerp(initialOrientation, finalOrientation, time, orientation);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            Cartesian3.lerp(initialCameraPositionWC, finalCameraPositionWC, time, camera.position);
            Matrix3.getRow(rotationMatrix, 0, camera.right);
            Matrix3.getRow(rotationMatrix, 1, camera.up);
            Matrix3.getRow(rotationMatrix, 2, camera.direction);
            Cartesian3.negate(camera.direction, camera.direction);
        };

        var duration = 3.0;
        var animation =
            {
                duration : duration,
                easingFunction : Tween.Easing.Sinusoidal.InOut,
                startObject : {
                    time : 0.0
                },
                stopObject : {
                    time : 1.0
                },
                update : updateCamera,
                complete : function() {
                    camera.transform = finalRefFrame;
                    camera.position = finalCameraPositionENU;
                    Cartesian3.normalize(Cartesian3.negate(camera.position, camera.direction), camera.direction);
                    Cartesian3.normalize(Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, camera.right), camera.right);
                    Cartesian3.normalize(Cartesian3.cross(camera.right, camera.direction, camera.up), camera.up);
                    enableInput(cesiumWidget.scene);
                    cesiumWidget.clock.shouldAnimate = true;
                    cesiumWidget.clock.currentTime = jdate;
                    transitionInProgress = false;
                }
            };

        cesiumWidget.scene.tweens.add(animation);

    }

    var pathObject = 'undefined';
    var location;
    var currentTrail = 'undefined';
    var pathVisualizers = 'undefined';
    var trailsVisualizers = 'undefined';
    var entityView;

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
        if (typeof entityView !== 'undefined') {
            entityView.update(clock.currentTime);
        }

        if(pathObject !== 'undefined') {

            // calculate instantaneous speed
            var currentPosition = pathObject.position.getValue(clock.currentTime);
            var time = new JulianDate();
            var startPosition = pathObject.position.getValue(JulianDate.addSeconds(clock.currentTime, -2.0, time));
            var distance = Cartesian3.distance(currentPosition, startPosition);
            var speed = distance * 1.23694; // m/s -> mph
            speed = Math.round(speed); // round to 2 decimal places

            // calculate slope
            var vec1 = new Cartesian3();
            var vec2 = new Cartesian3();
            var earth = cesiumWidget._globe.ellipsoid;
            startPosition = earth.cartesianToCartographic(pathObject.position.getValue(JulianDate.addSeconds(clock.currentTime, -2.0, time)));
            currentPosition = earth.cartesianToCartographic(pathObject.position.getValue(clock.currentTime));
            var altitude = Math.round(currentPosition.height * 3.28084);
            var referencePoint = currentPosition.clone();
            referencePoint.height = startPosition.height;
            startPosition = earth.cartographicToCartesian(startPosition);
            currentPosition = earth.cartographicToCartesian(currentPosition);
            referencePoint = earth.cartographicToCartesian(referencePoint);
            Cartesian3.subtract(referencePoint, startPosition, vec1);
            Cartesian3.subtract(currentPosition, startPosition, vec2);
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

    function setTimeFromBuffer(entityCollection) {

        var clock = cesiumWidget.clock;

        var availability = entityCollection.computeAvailability();
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

        if (defined(selectedObject) && defined(selectedObject.primitive) && defined(selectedObject.primitive.id)) {
            try {
                if( selectedObject.primitive.id instanceof Entity) {
                    var entity = selectedObject.primitive.id;
                    var jdate = JulianDate.fromIso8601(entity.id);
                    flyToTime(jdate);
                }
            } catch (e) {
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
    $( document ).ready(function() {
        setLoading(true);

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

        // set the Bing Maps key
        BingMapsApi.defaultKey = 'AkxNIkcN3YZwLVYAJpF08XExSR3DDR5OsItxNZYdwvIq0-RJT_VbPG9CD4OMvNw2';

        // initialize the Cesium widget
        cesiumWidget = new CesiumWidget('cesiumContainer', {
            terrainProvider : new CesiumTerrainProvider({
                url : 'http://cesiumjs.org/stk-terrain/tilesets/world/tiles'
            })
        });
        cesiumWidget._globe.depthTestAgainstTerrain = true;
        cesiumWidget.clock.onTick.addEventListener(updateData);

        // disable tilting with the middle mouse button
        cesiumWidget.scene.screenSpaceCameraController.tiltEventTypes = undefined;

        // initialize the animation controller
        var clockViewModel = new ClockViewModel(cesiumWidget.clock);
        clockViewModel.owner = this;
        clockViewModel.shouldAnimate = true;
        clockViewModel.clockRange = ClockRange.LOOP_STOP;
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

        // fullscreen button
        var fullscreenContainer = document.createElement('div');
        fullscreenContainer.className = 'fullscreenContainer';
        var cesiumContainer = document.getElementById('fullScreenContainer');
        cesiumContainer.appendChild(fullscreenContainer);
        var fullscreenButton = new FullscreenButton(fullscreenContainer, cesiumContainer);


        var slopeImageryProvider = new TileMapServiceImageryProvider({
            url : 'Gallery/SlopeShadeTiles',
            fileExtension: 'png',
            maximumLevel: 15,
            extent: new Extent(
                CesiumMath.toRadians(-111.8393519),
                CesiumMath.toRadians(40.4554630),
                CesiumMath.toRadians(-111.3080556),
                CesiumMath.toRadians(40.7639815))
        });
        var layers = cesiumWidget._globe.imageryLayers;
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
            animatingBillboard.scale = value.scale;
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
            if(defined(pickedObject) &&
                defined(pickedObject.primitive) &&
                !defined(animatingBillboard) &&
                pickedObject.primitive instanceof Billboard &&
                pickedObject.primitive.id._id !== "path" &&
                !pickedObject.highlighted) {

                // on enter
                animatingBillboard = pickedObject.primitive;
                animation = animation || scene.tweens.add({
                    update : updateAnimation,
                    complete : animationComplete,
                    startObject : {
                        scale : animatingBillboard.scale
                    },
                    stopObject : {
                        scale : 1.5
                    },
                    duration : 0.15,
                    easingFunction : Tween.Easing.Quartic.Out
                });
            }
            else if (defined(animatingBillboard) &&
                    animatingBillboard.highlighted &&
                    (   !defined(pickedObject) ||
                        (defined(pickedObject) &&
                        defined(pickedObject.primitive) &&
                        pickedObject.primitive !== animatingBillboard)
                    )) {
                // on exit
                animation = animation || scene.tweens.add({
                    update : updateAnimation,
                    complete : finalAnimationComplete,
                    startObject : {
                        scale : animatingBillboard.scale
                    },
                    stopObject : {
                        scale : 1.0
                    },
                    duration : 0.15,
                    easingFunction : Tween.Easing.Quartic.Out
                });
            }

        },
        ScreenSpaceEventType.MOUSE_MOVE);




        var pathCzml = "Gallery/DeerValley.czml";
        var trailsCzml = "Gallery/DeerValleyTrails.czml";
        location = "Deer Valley, UT";

        // load path czml
        var pathCzmlDataSource = new CzmlDataSource();
        pathCzmlDataSource.loadUrl(pathCzml).then(function() {

            var entityCollection =  pathCzmlDataSource.entities;
            setTimeFromBuffer(entityCollection);

            // set the camera to follow the path
            var lookAtObject = entityCollection.getById("path");
            flyToObject(cesiumWidget.scene, lookAtObject);
            pathObject = lookAtObject;

            // get the current trail object
            currentTrail = entityCollection.getById("CurrentTrail");

            var dataSourceCollection = new DataSourceCollection();
            dataSourceCollection.add(pathCzmlDataSource);
            pathVisualizers = new DataSourceDisplay({scene : cesiumWidget.scene, dataSourceCollection : dataSourceCollection});
            setLoading(false);

        });

        // load trails
        /*var trailsCzmlDataSource = new CzmlDataSource();
        trailsCzmlDataSource.loadUrl(trailsCzml).then(function() {
            var dataSourceCollection = new DataSourceCollection();
            dataSourceCollection.add(trailsCzmlDataSource);
            trailsVisualizers = new DataSourceDisplay({scene : cesiumWidget.scene, dataSourceCollection : dataSourceCollection});
        });*/

    });
});