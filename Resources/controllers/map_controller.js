Otlet.Controller("Map", {
  initialize: function () {
    this._window = null;
    this.map = null;
    this.is_ready = false;
    this.directions_read = false;
  },
  ready: function () {},
  map_ready: function (map) {
    this._window = document.all.map_iframe.contentWindow;
    this.map = this._window.Map;
    this.type = "physical";
    this.directions = this._window.Directions;
    this.geocoder = this._window.Geocoder;

    var self = this;

    this._add_listener("load", function () {
      self.is_ready = true;
      self.emit("load");
    });
    this._add_listener("click", function (obj, coords) {
      if(coords)
        return self.emit("click", coords);
      if(obj.openInfoWindow)
        return self.emit("marker_click", obj);
      if(obj.enableMaximize)
        return self.emit("infowindow_click", obj);
    });
    this._add_listener("zoomend", function (before, now) {
      self.emit("zoom", zoomLevelToPercent(before), zoomLevelToPercent(now));
    });

    this._window.GEvent.addListener(this.directions, "load", function () {
      self.emit("directions_loaded", self.directions);
    });

    this.show();
  },
  show: function () {
    this.map.hideControls();
    this.map.enableContinuousZoom();
    this.map.setCenter(this.point(45.051, 16.411), 6);
  },
  point: function (lat, lng) {
    return new this._window.GLatLng(lat, lng);
  },
  _add_listener: function (e, fn) {
    return this._window.GEvent.addListener(this.map, e, fn);
  },
  setType: function (type) {
    this.map.setMapType(this._window[type.toUpperCase().wrap("G_", "_MAP")]);
  },
  getType: function () {
    var type = this.map.getCurrentMapType().getName().toLowerCase();

    if(type == "teren")   return "physical";
    if(type == "hibrid")  return "hybrid";
                          return "normal";
  },
  setZoom: function (p) {
    var level = percentToZoomLevel(p);
    this.map.setZoom(level);
    return level;
  },
  getZoom: function () {
    return zoomLevelToPercent(this.map.getZoom());
  },
  setCenter: function (point) {
    return this.map.setCenter(point);
  },
  getCenter: function () {
    return this.map.getCenter();
  },
  pan_to: function (point) {
    return this.map.panTo(point);
  },
  center_and_zoom: function (point, zoom) {
    return this.map.setCenter(point, percentToZoomLevel(zoom));
  },
  add_marker: function (coords, config) {
    var marker = new this._window.GMarker(coords, config);
    this.map.addOverlay(marker);
    return marker;
  },
  remove_marker: function (marker) {
    if(marker)
      this.map.removeOverlay(marker);
    return this;
  },
  load_directions: function (points) {
    this.directions.loadFromWaypoints(points, {
      locale: Otlet.Language.current(),
      getPolyline: true,
      getSteps: true
    });
  },
  geocode: function (addr, fn) {
    this.geocoder.getLatLng(addr, fn);
  }
})

function C() {
  return Otlet.Controller("Map");
}

function percentToZoomLevel (p) {
  return Math.round(C().map.getCurrentMapType().getMaximumResolution() * (p/100));
}

function zoomLevelToPercent (l) {
  return l/C().map.getCurrentMapType().getMaximumResolution() * 100;
}