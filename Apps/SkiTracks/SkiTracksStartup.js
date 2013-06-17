/*global require*/
require({
    baseUrl : '../..',
    packages : [{
        name : 'Assets',
        location : 'Source/Assets'
    }, {
        name : 'Core',
        location : 'Source/Core'
    }, {
        name : 'DynamicScene',
        location : 'Source/DynamicScene'
    }, {
        name : 'Renderer',
        location : 'Source/Renderer'
    }, {
        name : 'Scene',
        location : 'Source/Scene'
    }, {
        name : 'Shaders',
        location : 'Source/Shaders'
    }, {
        name : 'ThirdParty',
        location : 'Source/ThirdParty'
    }, {
        name : 'Widgets',
        location : 'Source/Widgets'
    }, {
        name : 'Workers',
        location : 'Source/Workers'
    }, {
        name : 'SkiTracks',
        location : 'Apps/SkiTracks'
    }]
}, [
    'SkiTracks/SkiTracks'
], function() {
});