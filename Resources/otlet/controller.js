(function () {
  var controllers = {}, activated = {}, active, routes = [];

  var C = new JS.Class({
    include: [Otlet.Base, Otlet.Radio],
    initialize: function (matches) {
      if(!("private" in this.klass))
        this.klass.private = ["initialize", "main", "ready"];

      return this;
    },
    controlls: function (query) {
      return (query = $(query)).length ? this.container = query : false;
    },
    hide_current_hash: function (new_hash) {
      console.log("Hiding hash " + window.location.hash + " => " + new_hash);
      if(new_hash == window.location.hash.slice(1))
        return new_hash;

      Otlet.ignore_next_url_change();
      return new_hash ? window.location.hash = new_hash : window.history.go(-1);
    },
    require_ready_model: function (model) {
      if(!model._restored)
        return model.listen("restored", this.method("initialize"));
    },
    render: function (view, data, el) {
      return Otlet.view[this.klass._name + view.camelize()].render(data, el);
    },
    method_is_private: function (m) {
      return m.charAt(0) === "_" || this.klass.private.contains(m);
    },
    toString: function () {
      return "[Controller:" + this.klass._name + " " + this.iid + "]";
    }
  });

  Otlet.Controller = function (name, methods) {
    if(!arguments.length)
      return activated[active];
    if(!methods && name && name in activated)
      return activated[name];
    if(name in controllers)
      return false;

    controllers[name] = new JS.Class(C, Otlet.prepareClass(name, methods));
    return name === "Application" ? Otlet.Controller.init("Application") : controllers[name];
  };

  Otlet.Controller.init = function (name, args) {
    var controller;
    if(!(name in controllers))
      return false;
    if(name in activated)
      return activated[name];
    else
      controller = activated[name] = new controllers[name](args || []);
    
    active = name;
    if($.is_ready && "ready" in controller)
      activated[name].ready();

    return controller;
  };

  Otlet.__defineGetter__("Application", function () {
    return "Application" in activated ? activated.Application : undefined;
  });

  $(function () {
    $.is_ready = true;
    Otlet.Application.ready();
  });
})();
