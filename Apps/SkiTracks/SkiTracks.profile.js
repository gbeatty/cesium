var profile = {
    basePath : '../..',
    baseUrl : '.',
    releaseDir : './Build/Apps/SkiTracks',
    action : 'release',
    cssOptimize : 'comments',
    mini : true,
    optimize : 'closure',
    layerOptimize : 'closure',
    stripConsole : 'warn',
    selectorEngine : 'acme',
    layers : {
        'dojo/dojo' : {
            include : ['dojo/dojo', 'dojo/i18n'],
            boot : true,
            customBase : true
        },
        'SkiTracks/SkiTracksStartup' : {
            include : ['SkiTracks/SkiTracks', 'SkiTracks/SkiTracksStartup'],
            copyright : 'Source/copyrightHeader.js'
        }
    },

    packages : [{
        name : 'SkiTracks',
        destLocation : '.'
    }],

    staticHasFeatures : {
        'config-tlmSiblingOfDojo' : 0,
        'dojo-combo-api' : 0,
        'dojo-trace-api' : 0,
        'dojo-debug-messages' : 0,
        'dojo-log-api' : 0,
        'dojo-publish-privates' : 0,
        'dojo-sync-loader' : 0,
        'dojo-test-sniff' : 0,
        'dojo-firebug' : 0,
        'host-browser' : 1,
        'host-node' : 0,
        'host-rhino' : 0
    },

    resourceTags : {
        miniExclude : function(filename, mid) {
            "use strict";
            return mid in {
                'SkiTracks/SkiTracks.profile' : 1
            };
        },
        ignore : function(filename, mid) {
            "use strict";
            return (/\.glsl$/).test(filename) || (/\/Gallery\//).test(filename) || (/\/jquery-ui/).test(filename);
        },
        amd : function(filename, mid) {
            "use strict";
            return (/\.js$/).test(filename);
        }
    }
};