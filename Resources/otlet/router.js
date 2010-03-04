(function () {
var ROUTES = [],
    PATTERN_REGEXP = /:([aA-zZ])+/g;

function hasRouteFor (pattern, return_index) {
  var n = ROUTES.length;
  while(n--)
    if(ROUTES[n].pattern === pattern)
      return return_index ? n : true;
      
  return return_index ? -1 : false;
};

function routeFor (pattern) {
  var n = hasRouteFor(pattern, true);
  return n == -1 ? undefined : ROUTES[n];
};

function Route (pattern) {
  this.pattern    = pattern;
  this._name      = null;
  this.controller = null;
  this.action     = null;
  this.method     = null;

  ROUTES.push(this);

  return this;
};

Route.prototype = {
  pattern_matches: function () {
    return this.pattern.match(PATTERN_REGEXP) || [];
  },
  named_parts: function () {
    return this.pattern_matches().map(function (m) {
      return m.slice(1);
    });
  },
  map_to_url: function (url) {
    var matches = url.match(this.toRegExp());

    if(matches && matches.length > 1)
      return Hash.fromKeysAndValues(this.named_parts(), matches.slice(1)).map(function (k, v) {
        return isNaN(+v) ? decodeURIComponent(v) : +v;
      }).hash;
    else
      return {};
  },
  toRegExp: function () {
    var pattern = this.pattern.replace(PATTERN_REGEXP, "([^/\?:]*)");
    return new RegExp(pattern + (pattern.slice(-1) === "/" ? "?" : "/?"));
  },
  responds_to: function (url) {
    return !$.H(this.map_to_url(url)).isEmpty();
  },
  strip: function () {
    return {
      controller: String(this.controller),
      action:     String(this.action),
      method:     this.method
    };
  }
};

function RouteMatch (route) {
  this.route = route;
  return this;
}

RouteMatch.prototype = {
  to: function (controller, action) {
    if(!arguments.length)
      return this;

    if(Function.is(controller)) {
      this.route.method = controller;
      return this;
    }

    this.route.controller = controller;
    this.route.action = action;
    return this;
  },
  as: function (name) {
    if(arguments.length)
      this.route._name = name;

    return this;
  },
  redirect_to: function (url) {
    this.route.controller = undefined;
    this.route.action = undefined;
    this.route.method = function () {
      if(url.charAt(0) === "#")
        window.location.hash = url;
      else
        window.location = url;
    };

    return this;
  }
};

Otlet.router = {
  match: function (pattern) {
    if(pattern.slice(0, 1) === "#")
      pattern = window.location.href.split("#", 2)[0] + pattern;

    return new RouteMatch(new Route(pattern));
  },
  default_routes: function (hash) {
    hash = hash ? "#" : "";
    this.match(hash + ":controller/:action/:id").to(":controller", ":action");
    this.match(hash + ":controller/:action").to(":controller", ":action");
    this.match(hash + ":controller").to(":controller", "index");
  }
};

var prev_source;
function dispatch (url) {
  if(ignore_next)
    return (ignore_next = false);
  
  var route, source, method;

  for(var n = 0, m = ROUTES.length; n < m; n++) {
    route = ROUTES[n];
    if(route.responds_to(url))
      break;
    else
      route = null;
  }
  
  if(!route)
    throw new Error("No route found for: " + url);
  
  var mapped_values = route.map_to_url(url),
      different_source = true;
  route = route.strip();
  if(route.method) {
    source = route;
    method = source.method;
    if(prev_source)
      different_source = source.pattern !== prev_source.pattern;
  } else {
    if(route.controller.charAt(0) === ":")
      route.controller = mapped_values[route.controller.slice(1)];
    if(route.action.charAt(0) === ":")
      route.action = mapped_values[route.action.slice(1)];

    if(!(source = Otlet.Controller.init(route.controller)))
      throw new Error("There is no controller to handle request for: " + url);

    if(source.method_is_private(route.action)
        || !(method = source[route.action])
        || !Function.is(method))
      throw new Error("There is no action to handle request for: " + url);
    
    if(prev_source) {
      /* FIXME: Currently not working properly if prev_method is function */
      var prev_id = Function.is(prev_source) ? prev_source.toString() : prev_source.klass._name,
          curr_id = Function.is(source) ? source.toString() : source.klass._name;

      different_source = curr_id !== prev_id;
      delete prev_id;
      delete curr_id;
    }
  }

  method.apply(source, method.argumentNames().map(function (k) {
    return mapped_values[k];
  }));

  if(different_source)
    Otlet.Application.emit("url_source_change", source, prev_source);
  prev_source = source;
};

var ignore_next = false,
    _last_url = "",
    _url_observer_interval;

Otlet.observe_url_changes = function () {
  return _url_observer_interval = setInterval(function () {
    var href = window.location.href;
    _last_url !== href && dispatch(_last_url = href);
  }, 200);
};

Otlet.stop_observing_url_changes = function () {
  return clearInterval(_url_observer_interval);
};

Otlet.ignore_next_url_change = function () {
  return ignore_next = true;
};

})()
