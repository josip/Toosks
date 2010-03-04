/** 000space.com account
var MAP_URL = "http://toosks_maps.000space.com/maps.html",
    MAP_API_KEY = "ABQIAAAAcQjkm5HOpMyAYaaUh2mhshS4B7F1gdmeD2-obQB_vCrZN8sO5xTxfD5CDAqWMsc9by88KB0gFiraHg",
**/

var MAP_URL = "http://files.getdropbox.com/u/61185/maps.html",
    MAP_API_KEY = "ABQIAAAAcQjkm5HOpMyAYaaUh2mhshQhWjlqpGmXEZsHjCI0_VAZ-ZUrRhRfb0RnTGfWmhkoPFofMEB6XnArTA",
    Location = Otlet.model.Location,
    Map;

Otlet.Controller("Places", {
  initialize: function () {
    Map = Otlet.Controller.init("Map");
    this.visible_locations = [];
    this.location_markers = [];
    this.locations_for_directions = [];
    this.add_on_next_click = false;
    this.search_result = null;

    if(!Location.home())
      Location.storeAndCreate({
        hashtag: "@me".loc() + "-" + "#home".loc(),
        title: "home".loc(),
        lat: 45.051,
        lng: 16.411
      });

    if(!$.is_ready)
      Otlet.Application.listen("ready", this.ready, this);

    var self = this;
    Map.listen("load", this.method("_add_default_markers"));
    Map.listen("zoom", function (e, before, now) {
      $("#map_zoom_slider").slider("value", now);
    });
    Map.listen("click", function (e, coords) {
      if(self.add_on_next_click)
        self.add(coords);
    });
    Map.listen("marker_click", function (e, marker) {
      var coords = marker.getLatLng(),
          location = Location.find_first({
            lat: coords.lat(),
            lng: coords.lng()
          });
      
      if(location)
        self.show(location.id, marker);
      else
        console.log("unknown marker clicked");
    });
    Map.listen("directions_loaded", this.method("_directions_loaded"));
    
    Location.listen("new", reverseGeocodeForNewLocation);
    Location.listen("change", locationChanged);
    Location.listen("delete", locationDeleted);
  },
  ready: function () {
    $("#working").fadeIn();
    $("#content").append(this.render("index", {map_url: MAP_URL}));
    
    this.controlls("#places.page");
    this.$inspector = $("#place_inspector").hide();
    this.$directions_inspector = $("#directions_inspector").hide();
    this.container.find(".inspector").draggable({
      scroll: false,
      cancel: "a, .content span, img"
    });

    $("#map_iframe")[0].onload = function () {
      Map.map_ready();
      $("#working").fadeOut();
    };
    
    $("#map_zoom_slider").slider({
      orientation: "horizontal",
      stop: zoomSliderStopped
    });
  },
  index: function () {
    /* Map initialization is done in .ready() */
  },
  home: function () {
    this.show(Location.home().id);
  },
  show: function (id) {
    this.hide_current_hash("Places/index");
    var location = Location.find_first(id);

    if(!location)
      return alert("There is no location #" + id);
    
    this.current_location = location;
    var marker = arguments[1];
    if(!marker) {
      marker = markerForLocation(location);
      Map.pan_to(coords(location));
    }
    if(!Map.map.getBounds().containsLatLng(coords(location)))
      Map.center = coords(location);

    this.$inspector.find(".content").html(this.render("place", {place: location}));
    this.$inspector.fadeIn(270);

//    Map.pan_to(coords(location));
  },  
  map_type: function (id) {
    this.container
      .find(".actionbar .map_type")
      .removeClass("active")
      .find("a[href$=map_type/" + id + "]")
        .parent()
          .addClass("active");

    Map.type = id;
  },
  add: function () {
    this.hide_current_hash("Places/index");
    var $toggle_button = this.container.find("a[href$=Places/add]");
    if(!this.add_on_next_click) {
      $toggle_button.addClass("active");
      return this.add_on_next_click = true;
    }

    this.add_on_next_click = false;
    $toggle_button.removeClass("active");

    var coords = arguments[0];
    if(!coords)
      return false;

    var location = Otlet.model.Location.storeAndCreate({
          title: prompt("title for place"),
          hashtag: prompt("hashtag for place"),
          lat: coords.lat(),
          lng: coords.lng()
        });

    this.visible_locations.push(location);
    this.location_markers.push(Map.add_marker(coords, {}));
    this.show(location.id);
  },
  del: function (id) {
    this.hide_current_hash("Places/index");
    Location.find_first(id).del();
  },
  inspector: function (id) {
    this.hide_current_hash("Places/index");

    if(id === "hide")
      return this.$inspector.fadeOut(270);
    if(id === "show")
      return this.$inspector.fadeIn(120);
  },
  directions_for_project: function (id) {
    var locations = Otlet.model.Project.find_first(id).locations().uniq();
    if(!locations.length)
      return false;
    else if(locations.length == 1)
      this.show(locations[0].id);
    else {
      this.locations_for_directions = locations;
      Map.load_directions(locations.map(function (l) {
        return l.coords();
      }));
    }
  },
  complete_directions: function () {
    var locs  = this.locations_for_directions,
        url   = ["http://maps.google.com/maps?f=d&source=s_d&hl=" + Otlet.Language.current()];
    
    url.push("saddr=" + locs[0].coords());
    locs = locs.slice(1);
    url.push("daddr=" + locs.map(function (l) {
      return l.coords();
    }).join("+to:"));
    url.push("mra=ls&ie=UTF8&pw=2&z=" + Map.map.getZoom());

    Titanium.Desktop.openURL(url.join("&"));
  },
  hide_directions: function () {
    this.$directions_inspector
      .fadeOut(120)
      .find(".content")
        .html("");
    this.locations_for_directions.length = 0;
    Map.directions.clear();
  },
  search: function () {
    Map.geocode($("#search_maps").val().trim(), this.method("_show_search_results"));
  },

  _add_default_markers: function () {
    if(this.visible_locations.length)
      return false;

    this.visible_locations = Location.find();
    var n = this.visible_locations.length,
        markers = new Array(n),
        location;

    while(n--) {
      location = this.visible_locations[n];
      markers[n] = Map.add_marker(coords(location), markerConfigForLocation(location));
    }

    this.location_markers = markers;
  },
  _directions_loaded: function (e, directions) {
    this.$directions_inspector
      .fadeIn(270)
      .find(".content")
        .html(this.render("directions", {
          directions: directions
        }));
  },
  _show_search_results: function (point) {
    if(!point)
      $("#search_maps").effect("highlight", {color: "#f00"}, 270);

    Map.remove_marker(this.search_result);
    this.search_result = Map.add_marker(point, {});
  }
});

function C () {
  return Otlet.Controller("Places");
}

function coords (loc) {
  return point(loc.attr("lat"), loc.attr("lng"));
}

function point (lat, lng) {
  return Map.point(lat, lng);
}

function markerConfigForLocation (loc) {
  return {draggable: true};
}

function markerForLocation (loc) {
  var coords = [loc.attr("lat"), loc.attr("lng")],
      markers = C().location_markers,
      n = markers.length;

  while(n--) {
    var marker = markers[n],
        marker_coords = marker.getLatLng();

    if(coords[0] == marker_coords.lat() && coords[1] == marker_coords.lng())
      return marker;
  }
}

function isLocationActive (loc) {
  return C().current_location.id === loc.id;
}

function zoomSliderStopped (e, ui) {
  Map.zoom = ui.value%100;
}

function reverseGeocodeForNewLocation (e, loc) {
  var url = "http://maps.google.com/maps/geo?q=";
      url += loc.coords() + "&output=json&oe=utf8&sensor=false&hl=" + Otlet.Language.current() + "&";
      url += "key=" + MAP_API_KEY;

  $.getJSON(url, function (resp) {
    if(resp.Status.code !== 200)
      return false;

    var placemark = resp.Placemark[0];
    if(placemark)
      loc.update("descrip", placemark.address);
  });
}

function locationChanged (e, loc, changed) {
  if("descrip" in changed && isLocationActive(loc))
    C().$inspector.find(".content p").html(loc.attr("descrip"));
}

function locationDeleted (e, loc) {
  markerForLocation(loc).remove();

  if(isLocationActive(loc))
    C().$inspector.fadeOut();
}
