define([
    './appendForwardSlash',
    './Check',
    './clone',
    './combine',
    './defaultValue',
    './defined',
    './defineProperties',
    './freezeObject',
    './getAbsoluteUri',
    './getBaseUri',
    './objectToQuery',
    './queryToObject',
    '../ThirdParty/Uri'
], function(appendForwardSlash,
            Check,
            clone,
            combine,
            defaultValue,
            defined,
            defineProperties,
            freezeObject,
            getAbsoluteUri,
            getBaseUri,
            objectToQuery,
            queryToObject,
            Uri) {
    'use strict';

    /**
     * @private
     */
    function parseQuery(queryString) {
        if (queryString.length === 0) {
            return {};
        }

        // Special case we run into where the querystring is just a string, not key/value pairs
        if (queryString.indexOf('=') === -1) {
            var result = {};
            result[queryString] = undefined;
            return result;
        }

        return queryToObject(queryString);
    }

    /**
     * @private
     */
    function stringifyQuery(queryObject) {
        var keys = Object.keys(queryObject);

        // We have 1 key with an undefined value, so this is just a string, not key/value pairs
        if (keys.length === 1 && !defined(queryObject[keys[0]])) {
            return keys[0];
        }

        return objectToQuery(queryObject);
    }

    /**
     * @private
     */
    function encodeValues(object) {
        var result = {};
        for(var key in object) {
            if (object.hasOwnProperty(key)) {
                result[key] = encodeURIComponent(object[key]);
            }
        }

        return result;
    }

    /**
     * @param {Object} options An object with the following properties
     * @param {String} options.url
     * @param {Object} [options.queryParameters]
     * @param {Object} [options.templateValues]
     * @param {Object} [options.headers={}]
     * @param {Request} [options.request]
     * @param {String} [options.method='GET']
     * @param {Object} [options.data]
     * @param {String} [options.overrideMimeType]
     * @param {DefaultProxy} [options.proxy]
     * @param {Boolean} [options.allowCrossOrigin=true]
     * @param {Boolean} [options.isDirectory=false] The url should be a directory, so make sure there is a trailing slash
     *
     * @constructor
     */
    function Resource(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('options.url', options.url);
        //>>includeEnd('debug');

        this._url = '';
        this._templateValues = encodeValues(defaultValue(options.templateValues, {}));
        this._queryParameters = defaultValue(options.queryParameters, {});
        this.isDirectory = defaultValue(options.isDirectory, false);

        this.url = options.url;

        this.headers = defined(options.headers) ? clone(options.headers) : {};
        this.request = options.request;
        this.responseType = options.responseType;
        this.method = defaultValue(options.method, 'GET');
        this.data = options.data;
        this.overrideMimeType = options.overrideMimeType;
        this.proxy = options.proxy;
        this.allowCrossOrigin = defaultValue(options.allowCrossOrigin, true);

        this._retryOnError = options.retryOnError;
        this._retryAttempts = defaultValue(options.retryAttempts, 0);
        this._retryCount = 0;
    }

    Resource.createIfNeeded = function(resource, options) {
        if (!defined(resource)) {
            return;
        }

        if (typeof resource === 'string') {
            var args = defined(options) ? clone(options) : {};
            args.url = resource;
            resource = new Resource(args);
        }

        return resource;
    };

    defineProperties(Resource.prototype, {
        queryParameters: {
            get: function() {
                return this._queryParameters;
            }
        },
        templateValues: {
            get: function() {
                return this._templateValues;
            }
        },
        url: {
            get: function() {
                return this.getUrl(true, true);
            },
            set: function(value) {
                var uri = new Uri(value);

                if (defined(uri.query)) {
                    var query = parseQuery(uri.query);
                    this._queryParameters = combine(this._queryParameters, query);
                    uri.query = undefined;
                }

                // Remove the fragment as it's not sent with a request
                uri.fragment = undefined;

                this._url = uri.toString();

                if (this.isDirectory) {
                    this._url = appendForwardSlash(this._url);
                }
            }
        }
    });

    Resource.prototype.getUrl = function(query, proxy) {
        var uri = new Uri(this._url);

        if (query) {
            uri.query = stringifyQuery(this._queryParameters);
        }

        // objectToQuery escapes the placeholders.  Undo that.
        var url = uri.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');

        var template = this._templateValues;
        var keys = Object.keys(template);
        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = template[key];
                url = url.replace(new RegExp('{' + key + '}', 'g'), value);
            }
        }
        if (proxy && defined(this.proxy)) {
            url = this.proxy.getURL(url);
        }
        return url;
    };

    Resource.prototype.addQueryParameters = function(params, useAsDefault) {
        if (useAsDefault) {
            this._queryParameters = combine(this._queryParameters, params);
        } else {
            this._queryParameters = combine(params, this._queryParameters);
        }
    };

    Resource.prototype.addTemplateValues = function(template) {
        this._templateValues = combine(encodeValues(template), this._templateValues);
    };

    /**
     * @param {Object} options An object with the following properties
     * @param {String} options.url
     * @param {Object} [options.queryParameters]
     * @param {Object} [options.templateValues]
     * @param {Object} [options.headers={}]
     * @param {Request} [options.request]
     * @param {String} [options.method='GET']
     * @param {Object} [options.data]
     * @param {String} [options.overrideMimeType]
     * @param {DefaultProxy} [options.proxy]
     * @param {Boolean} [options.allowCrossOrigin=true]
     * @param {Boolean} [options.isDirectory=false]
     */
    Resource.prototype.getDerivedResource = function(options) {
        var resource = this.clone();
        resource.isDirectory = false; // By default derived resources aren't a directory, but this can be overridden

        if (defined(options.url)) {
            var uri = new Uri(options.url);

            // Remove the fragment as it's not sent with a request
            uri.fragment = undefined;

            if (defined(uri.query)) {
                var query = parseQuery(uri.query);
                uri.query = undefined;
                resource._queryParameters = combine(query, resource._queryParameters);
            }

            resource._url = uri.resolve(new Uri(this._url)).toString();
        }

        if (defined(options.queryParameters)) {
            resource._queryParameters = combine(options.queryParameters, resource._queryParameters);
        }
        if (defined(options.templateValues)) {
            resource._templateValues = combine(encodeValues(options.templateValues), resource.templateValues);
        }
        if (defined(options.headers)) {
            resource.headers = combine(options.headers, resource.headers);
        }
        if (defined(options.responseType)) {
            resource.responseType = options.responseType;
        }
        if (defined(options.method)) {
            resource.method = options.method;
        }
        if (defined(options.data)) {
            resource.data = options.data;
        }
        if (defined(options.overrideMimeType)) {
            resource.overrideMimeType = options.overrideMimeType;
        }
        if (defined(options.proxy)) {
            resource.proxy = options.proxy;
        }
        if (defined(options.allowCrossOrigin)) {
            resource.allowCrossOrigin = options.allowCrossOrigin;
        }
        if (defined(options.request)) {
            resource.request = options.request;
        }
        if (defined(options.isDirectory)) {
            resource.isDirectory = options.isDirectory;
        }

        return resource;
    };

    Resource.prototype.retryOnError = function(options) {
        if (this._retryCount > this._retryAttempts) {
            return false;
        }
        var retry = true;
        var callback = this._retryOnError;
        if (typeof callback === 'function') {
            retry = callback(this, options);
        }
        if (retry) {
            this._retryCount++;
        }
        return retry;
    };

    Resource.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new Resource({
                url : this._url
            });
        }

        result._url = this._url;
        result._queryParameters = this._queryParameters;
        result._templateValues = this._templateValues;
        result.headers = this.headers;
        result.request = this.request;
        result.responseType = this.responseType;
        result.method = this.method;
        result.data = this.data;
        result.overrideMimeType = this.overrideMimeType;
        result.proxy = this.proxy;
        result.allowCrossOrigin = this.allowCrossOrigin;
        result.isDirectory = this.isDirectory;

        return result;
    };

    /**
     * A resource instance initialized to the current browser location
     *
     * @type {Resource}
     * @constant
     */
    Resource.DEFAULT = freezeObject(new Resource({
        url: defined(document) ? document.location.href.split('?')[0] : ''
    }));

    return Resource;
});
