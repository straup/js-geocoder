/* ======================================================================
    jsr.src.js
   ====================================================================== */

// jsr_class.js
//
// JSONscriptRequest -- a simple class for making HTTP requests
// using dynamically generated script tags and JSON
//
// Author: Jason Levitt
// Date: December 7th, 2005
//
// A SECURITY WARNING FROM DOUGLAS CROCKFORD:
// "The dynamic <script> tag hack suffers from a problem. It allows a page 
// to access data from any server in the web, which is really useful. 
// Unfortunately, the data is returned in the form of a script. That script 
// can deliver the data, but it runs with the same authority as scripts on 
// the base page, so it is able to steal cookies or misuse the authorization 
// of the user with the server. A rogue script can do destructive things to 
// the relationship between the user and the base server."
//
// So, be extremely cautious in your use of this script.
//
//
// Sample Usage:
//
// <script type="text/javascript" src="jsr_class.js"></script>
// 
// function callbackfunc(jsonData) {
//      alert('Latitude = ' + jsonData.ResultSet.Result[0].Latitude + 
//            '  Longitude = ' + jsonData.ResultSet.Result[0].Longitude);
//      aObj.removeScriptTag();
// }
//
// request = 'http://api.local.yahoo.com/MapsService/V1/geocode?appid=YahooDemo&
//            output=json&callback=callbackfunc&location=78704';
// aObj = new JSONscriptRequest(request);
// aObj.buildScriptTag();
// aObj.addScriptTag();
//
//


// Constructor -- pass a REST request URL to the constructor
//
function JSONscriptRequest(fullUrl) {
    // REST request path
    this.fullUrl = fullUrl; 
    // Keep IE from caching requests
    this.noCacheIE = '&noCacheIE=' + (new Date()).getTime();
    // Get the DOM location to put the script tag
    this.headLoc = document.getElementsByTagName("head").item(0);
    // Generate a unique script tag id
    this.scriptId = 'JscriptId' + JSONscriptRequest.scriptCounter++;
}

// Static script ID counter
JSONscriptRequest.scriptCounter = 1;

// buildScriptTag method
//
JSONscriptRequest.prototype.buildScriptTag = function () {

    // Create the script tag
    this.scriptObj = document.createElement("script");
    
    // Add script object attributes
    this.scriptObj.setAttribute("type", "text/javascript");
    this.scriptObj.setAttribute("charset", "utf-8");
    this.scriptObj.setAttribute("src", this.fullUrl + this.noCacheIE);
    this.scriptObj.setAttribute("id", this.scriptId);
}
 
// removeScriptTag method
// 
JSONscriptRequest.prototype.removeScriptTag = function () {
    // Destroy the script tag
    this.headLoc.removeChild(this.scriptObj);  
}

// addScriptTag method
//
JSONscriptRequest.prototype.addScriptTag = function () {
    // Create the script tag
    this.headLoc.appendChild(this.scriptObj);
}
/* ======================================================================
    geocoder.src.js
   ====================================================================== */


if (! info){
    var info = {};
}

if (! info.aaronland){
    info.aaronland = {};
}

if (! info.aaronland.geo){
    info.aaronland.geo = {};
}

info.aaronland.geo.GeocoderResult = function(provider, query, lat, lon, zoom){
    this.provider = provider;
    this.query = query;
    this.lat = lat;
    this.lon = lon;
    this.zoom = zoom;
}

info.aaronland.geo.GeocoderError = function(provider, query, errmsg){
    this.provider = provider;
    this.query = query;
    this.message = errmsg;
}

info.aaronland.geo.Geocoder = function(args){

    this.args = args;
    this.providers = args['providers'];

    this.canhas_console = (typeof(console) == 'object') ? 1 : 0;

    this.current_provider = null;
    this.current_query = null;

    this.on_success = null;
    this.on_fail = null;
};

info.aaronland.geo.Geocoder.prototype.geocode = function(query, doThisOnSuccess, doThisIfNot, idx){

    if (typeof(idx) == 'undefined'){
        idx = 0;
    }

    var provider = this.providers[ idx ];

    this.current_provider = provider;
    this.current_query = query;

    this.log("geocode w/ " + provider);

    var local_doThisIfNot = doThisIfNot;

    if ((idx < this.providers.length) && (idx != this.providers.length)){

	var next_idx = idx + 1;
        var next_provider = this.providers[ next_idx ];

        var _self = this;
            
        local_doThisIfNot = function(){

            _self.log("geocoding failed, trying again w/ " + next_provider);
            _self.geocode(query, doThisOnSuccess, doThisIfNot, next_idx);
            return;
        };
    }

    // 

    this.on_success = doThisOnSuccess;
    this.on_fail = local_doThisIfNot;

    //

    if (provider == 'bing'){
        this._bing();
        return;
    }

    else if (provider == 'cloudmade'){
        this._cloudmade();
        return;
    }

    else if (provider == 'flickr'){
        this._flickr();
        return;
    }

    else if (provider == 'geocoder.us'){
        this._geocoder_us();
        return;
    }

    else if (provider == 'geonames'){
        this._geonames();
        return;
    }

    else if (provider == 'google'){
        this._google();
        return;
    }

    else if (provider == 'placemaker'){
        this._placemaker();
        return;
    }
    
    else {
        this.error('unknown provider');
        return;
    }
};

info.aaronland.geo.Geocoder.prototype._google = function(){

    // http://code.google.com/apis/maps/documentation/v3/services.html#GeocodingRequests

    if (typeof(google) != 'object'){
        this.error('missing libraries');
        return;
    }

    var _self = this;

    var _geocodeComplete = function(results, status) {

        if (status != google.maps.GeocoderStatus.OK){
            _self.error('server error');
            return;
        }

        if ((! results) || (! results.length)){
            _self.error('no results');
            return;
        }
        
        loc = results[0].geometry;
        lat = loc.location.lat();
        lon = loc.location.lng();
        type = loc.location_type;

        if (type == google.maps.GeocoderLocationType.ROOFTOP){
            zoom = 17;
        }
        
        else if (type == google.maps.GeocoderLocationType.RANGE_INTERPOLATED){
            zoom = 15;
        }
        
        else if (type == google.maps.GeocoderLocationType.GEOMETRIC_CENTER){
            zoom = 13;
        }
        
        else {
            zoom = 11;
        }

        _self.success(lat, lon, zoom);
        return;
    };

    var goog = new google.maps.Geocoder();
    goog.geocode({'address' : this.current_query}, _geocodeComplete);

    this.log("google geocoding request dispatched");
    return;
};

info.aaronland.geo.Geocoder.prototype._bing = function(){

    // http://msdn.microsoft.com/en-us/library/cc161074.aspx

    if (typeof(VEMap) != 'function'){
        this.error('missing libraries');
        return;
    }

    var _self = this;

    var _bingCallback = function(shapeLayer, findResults, places, moreResults, errorMsg){

        if (places == null){
            _self.error('no results: ' + errorMsg);
            return
        }

        _self.sucess(loc[0], loc[1]);
        return;
    };

    // no, really...

    var div = document.createElement('div');
    div.setAttribute('id', 'invisible_map');
    div.setAttribute('style', 'display:none');
    document.body.appendChild(div);

    var bing = new VEMap('invisible_map');
    bing.LoadMap();

    // the mind reels...

    bing.Find(null,    // what
              this.current_query, // where
              null,    // VEFindType (always VEFindType.Businesses)
              null,    // VEShapeLayer (base by default)
              null,    // start index for results (0 by default)
              null,    // max number of results (default is 10)
              null,    // show results? (default is true)
              null,    // create pushpin for what results? (ignored since what is null)
              null,    // use default disambiguation? (default is true)
              null,    // set best map view? (default is true)
              _bingCallback);  // call back function

    this.log("bing geocoding request dispatched");
    return;
};

info.aaronland.geo.Geocoder.prototype._flickr = function(){

    if (typeof(info.aaronland.flickr) != 'object'){
        this.error('missing libraries');
        return;
    }

    if (! this.args['flickr_apikey']){
        this.error("missing flickr api key");
        return;
    }

    var _self = this;

    // dirty dirty dirty...

    window['_flickrGeocodeComplete'] = function(rsp){

        if (rsp.stat == 'fail'){
            _self.error("received (failed) response from flickr");
            return;
        }

        var count = rsp.places.total;

        if (! count){
            _self.error("received (failed) response from flickr");
            return;
        }

        if (count > 1){
            _self.log("geocoding returned " + count + " results, using the first...");
        }

        var place = rsp.places.place[0];
        var lat = place.latitude;
        var lon = place.longitude;
        var type = place.place_type;

        if (type == 'neighbourhood'){
            zoom = 15;
        }
        
        else if (type == 'locality'){
            zoom = 13;
        }
        
        else if (type == 'county'){
            zoom = 10;
        }

        else if (type == 'country'){
            zoom = 7;
        }
        
        else {
            zoom = 3;
        }

        _self.success(lat, lon, zoom);
        return;
    };

    //

    var flickr_args = {
        'key' : this.args['flickr_apikey'],
        'enable_logging' : this.args['enable_logging'],
    };

    var flickr = new info.aaronland.flickr.API(flickr_args);
    var method = 'flickr.places.find';

    var args = {
        'query': this.current_query,
        'jsoncallback': '_flickrGeocodeComplete'
    };

    flickr.api_call(method, args);

    this.log("query dispatched to " + flickr);
    return;
};

info.aaronland.geo.Geocoder.prototype._geonames = function(){

    this.error('geonames support not complete');
    return;

    // var url = 'http://ws.geonames.org/searchJSON?q=' + encodeURIComponent(this.current_query);
};

info.aaronland.geo.Geocoder.prototype._cloudmade = function(){

    // http://developers.cloudmade.com/projects/web-maps-lite/examples/geocoding

    if (typeof(CM) != 'object'){
        this.error('missing cloudmade libraries');
        return;
    }

    if (typeof(CM.Geocoder) != 'function'){
        this.error('missing cloudmade libraries');
        return;
    }
    
    if (! this.args['cloudmade_apikey']){
        this.error('missing cloudmade api key');
        return;
    }

    var _self = this;

    var _geocodeComplete = function(rsp){

        if (! rsp.found){
            _self.error("received (failed) response from cloudmade");
            return;
        }

        // work out zoom level based on rsp.features[0].properties.place

        var loc = rsp.features[0].centroid.coordinates;
        var zoom = null;

        _self.success(loc[0], loc[1], null);
        return;
    };

    var cm = new CM.Geocoder(this.args['cloudmade_apikey']);
    cm.getLocations(this.current_query, _geocodeComplete);

    this.log("query dispatched to cloudmade");
};

info.aaronland.geo.Geocoder.prototype._placemaker = function(){

    // http://icant.co.uk/jsplacemaker/

    if (typeof(Placemaker) != 'object'){
        this.err('missing placemaker libraries');
        return;
    }

    if (! this.args['placemaker_apikey']){
        this.err('missing placemaker api key');
        return;
    }

    var _self = this;

    var _onMatch = function(rsp){
        
        if (rsp.error){
            _self.error(rsp.error);
            return;
        }

        var match = rsp.match;
        var place = (typeof(match[0]) == 'undefined') ? match.place : match[0].place;

        var woeid = place.woeId;

        var lat = place.centroid.latitude;
        var lon = place.centroid.longitude;
        var zoom = 2;

        switch (place.type){
        	case 'Suburb' :
                    zoom = 14;
                    break;
        	case 'Town' :
                    zoom = 12;
                    break;
        	case 'County' :
                    zoom = 10;
                    break;
        	case 'State' :
                    zoom = 7;
                    break;
        	default :
                    zoom = 5;
                    break;
        }

        _self.success(lat, lon, zoom);
        return;
    };

    Placemaker.config.appID = this.args['placemaker_apikey'];
    Placemaker.getPlaces(this.current_query, _onMatch, 'en-us');

    this.log('query dispatched to placemaker');
}

info.aaronland.geo.Geocoder.prototype._geocoder_us = function(){

    this.error('geocoder.us support not complete');
    return;

    window['_geocoderUSGeocodeComplete'] = function (rsp){
    };

    var url = 'http://rpc.geocoder.us/service/json?jsoncallback=_geocoderUSGeocodeCallback';
    url += '&address=' + encodeURIComponent(this.current_query);

    jsr = new JSONscriptRequest(url); 

    jsr.noCacheIE = '';
    jsr.buildScriptTag(); 
    jsr.addScriptTag();

    this.log('query dispatched to geocoder.us');
}

info.aaronland.geo.Geocoder.prototype.success = function(lat, lon, zoom){

    this.log(this.current_provider + ' returned OK');
    var result = new info.aaronland.geo.GeocoderResult(this.current_provider, this.current_query, lat, lon, zoom);

    this.on_success(result);
    return;
}

info.aaronland.geo.Geocoder.prototype.error = function(msg){

    this.log(this.current_provider + ' failed: ' + msg);

    var error = new info.aaronland.geo.GeocoderError(this.current_provider, this.current_query, msg);

    this.on_fail(error);
    return;
}

info.aaronland.geo.Geocoder.prototype.log = function(msg){

    if (! this.canhas_console){
        return;
    }

    console.log("[geocoder] " + msg);
};

// -*-java-*-
