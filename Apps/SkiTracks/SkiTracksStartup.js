/*global require*/
require({
    baseUrl : '../../Source',
    paths : {
        SkiTracks : '../Apps/SkiTracks',
        domReady : '../ThirdParty/requirejs-2.1.6/domReady'
    }
}, ['SkiTracks/SkiTracks'], function() {
});