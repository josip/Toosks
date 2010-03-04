Otlet.View.template_helpers.gmaps_link = function (loc) {
  var zoom_and_type = "";
  if(Otlet.Controller("Map") && Otlet.Controller("Map").is_ready) {
    zoom_and_type = "&z=" + Otlet.Controller("Map").map.getZoom();
    zoom_and_type += "&t=" + Otlet.Controller("Map").type[0];
  }

  return "http://maps.google.com/?ie=UTF8&ll=" + loc.coords() + "&t=h" + zoom_and_type;
}