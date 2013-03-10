/*global define*/
define([
        './DynamicProperty',
        './CzmlVideo',
        './CzmlNumber',
        './CzmlBoolean',
        './CzmlTime',
        '../Scene/Material',
        '../Core/JulianDate'
    ], function(
         DynamicProperty,
         CzmlVideo,
         CzmlNumber,
         CzmlBoolean,
         CzmlTime,
         Material,
         JulianDate) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias DynamicVideoMaterial
     * @constructor
     */
    var DynamicVideoMaterial = function() {
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's image.
         * @type DynamicProperty
         */
        this.video = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's vertical repeat.
         * @type DynamicProperty
         */
        this.verticalRepeat = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type DynamicProperty
         */
        this.horizontalRepeat = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type DynamicProperty
         */
        this.startTime = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type DynamicProperty
         */
        this.loop = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type DynamicProperty
         */
        this.speed = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains image material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML image material data, false otherwise.
     */
    DynamicVideoMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.video !== 'undefined';
    };

    /**
     * Provided a CZML interval containing image material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns The modified existingMaterial parameter or a new DynamicVideoMaterial instance if existingMaterial was undefined or not a DynamicVideoMaterial.
     */
    DynamicVideoMaterial.prototype.processCzmlIntervals = function(czmlInterval, sourceUri) {
        var materialData = czmlInterval.video;
        if (typeof materialData === 'undefined') {
            return;
        }

        if (typeof materialData.video !== 'undefined') {
            var video = this.video;
            if (typeof video === 'undefined') {
                this.video = video = new DynamicProperty(CzmlVideo);
            }
            video.processCzmlIntervals(materialData.video, undefined, sourceUri);
        }

        if (typeof materialData.verticalRepeat !== 'undefined') {
            var verticalRepeat = this.verticalRepeat;
            if (typeof verticalRepeat === 'undefined') {
                this.verticalRepeat = verticalRepeat = new DynamicProperty(CzmlNumber);
            }
            verticalRepeat.processCzmlIntervals(materialData.verticalRepeat);
        }

        if (typeof materialData.horizontalRepeat !== 'undefined') {
            var horizontalRepeat = this.horizontalRepeat;
            if (typeof horizontalRepeat === 'undefined') {
                this.horizontalRepeat = horizontalRepeat = new DynamicProperty(CzmlNumber);
            }
            horizontalRepeat.processCzmlIntervals(materialData.horizontalRepeat);
        }

        if (typeof materialData.startTime !== 'undefined') {
            var startTime = this.startTime;
            if (typeof startTime === 'undefined') {
                this.startTime = startTime = new DynamicProperty(CzmlTime);
            }
            startTime.processCzmlIntervals(materialData.startTime);
        }

        if (typeof materialData.loop !== 'undefined') {
            var loop = this.loop;
            if (typeof loop === 'undefined') {
                this.loop = loop = new DynamicProperty(CzmlBoolean);
            }
            loop.processCzmlIntervals(materialData.loop);
        }

        if (typeof materialData.speed !== 'undefined') {
            var speed = this.speed;
            if (typeof speed === 'undefined') {
                this.speed = speed = new DynamicProperty(CzmlNumber);
            }
            speed.processCzmlIntervals(materialData.speed);
        }
    };

    var startTime;
    function  syncVideo(video, existingMaterial, animationRate) {

        var playbackRate = animationRate * existingMaterial.speed;
        if(video.playbackRate !== playbackRate) {
            video.playbackRate = playbackRate;
        }

        var duration = video.duration;
        //TODO: We should probably be checking the video.seekable segments
        //before setting the currentTime, but if there are no seekable
        //segments, then this code will have no affect, so the net result
        //seems to be the same.
        var videoTime = startTime.getSecondsDifference(existingMaterial.time);
        videoTime = videoTime * existingMaterial.speed;
        if (existingMaterial.loop) {
            videoTime = videoTime % duration;
            if (videoTime < 0.0) {
                videoTime = duration - videoTime;
            }
        } else if (videoTime > duration) {
            videoTime = duration;
        } else if (videoTime < 0.0) {
            videoTime = 0.0;
        }

        // seek to correct time if video has gotten out of sync
        if( Math.abs(videoTime - video.currentTime) > 0.2 ) {
            video.currentTime = videoTime;
        }
    }

    /**
     * Gets an Image Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not an Image Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Image Material instance if existingMaterial was undefined or not a Image Material.
     */
    var videoLoaded = false;
    var previousTime = 'undefined';
    var previousSystemTime = 'undefined';
    DynamicVideoMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || (existingMaterial.type !== Material.ImageType)) {
            existingMaterial = Material.fromType(context, Material.ImageType);
        }

        var xRepeat;
        var property = this.verticalRepeat;
        if (typeof property !== 'undefined') {
            xRepeat = property.getValue(time);
            if (typeof xRepeat !== 'undefined') {
                existingMaterial.uniforms.repeat.x = xRepeat;
            }
        }

        var yRepeat;
        property = this.horizontalRepeat;
        if (typeof property !== 'undefined') {
            yRepeat = property.getValue(time);
            if (typeof yRepeat !== 'undefined') {
                existingMaterial.uniforms.repeat.y = yRepeat;
            }
        }

        var loop = false;
        property = this.loop;
        if (typeof property !== 'undefined') {
            loop = property.getValue(time);
        }

        var speed = 1;
        property = this.speed;
        if (typeof property !== 'undefined') {
            speed = property.getValue(time);
        }

        existingMaterial.speed = speed;
        existingMaterial.loop = loop;
        existingMaterial.time = time;

        property = this.startTime;
        if (typeof property !== 'undefined') {
            startTime = property.getValue(time, startTime);
        }

        var video;
        property = this.video;
        if (typeof property !== 'undefined') {
            var url = property.getValue(time);
            if (typeof url !== 'undefined' && existingMaterial.currentUrl !== url) {
                videoLoaded = false;
                existingMaterial.currentUrl = url;
                if (typeof existingMaterial.video !== 'undefined') {
                    //existingMaterial.video.removeEventListener("seeked", seekFunction, false);
                    document.body.removeChild(existingMaterial.video);
                }
                video = existingMaterial.video = document.createElement('video');
                document.body.appendChild(video);
                video.style.display = 'none';
                video.preload = 'auto';
                video.addEventListener("loadeddata", function() {
                    //console.log("load event fired");
                    //seekFunction = createSeekFunction(context, video, existingMaterial);
                    //video.addEventListener("seeked", seekFunction, false);
                    //seekFunction();

                    video.playbackRate = 0.0;
                    video.play();
                    videoLoaded = true;
                }, false);

                video.src = url;
                video.load();
            }
        }
        video = existingMaterial.video;


        if (typeof existingMaterial.texture === 'undefined') {
            existingMaterial.texture = context.createTexture2D({
                source : video
            });
            existingMaterial.uniforms.image = existingMaterial.texture;
        }

        var currentSystemTime = new Date().getTime();
        if(videoLoaded && previousTime !== 'undefined' && previousSystemTime !== 'undefined') {

            var animationRate = (time-previousTime) / (currentSystemTime-previousSystemTime);
            syncVideo(video, existingMaterial, animationRate);

            // copy the video frame into the material texture
            existingMaterial.texture.copyFrom(video);
        }

        previousSystemTime = currentSystemTime;
        previousTime = time;

        return existingMaterial;
    };

    return DynamicVideoMaterial;
});