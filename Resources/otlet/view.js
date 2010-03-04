(function () {
  Otlet.view = {};

  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  var tmpl_cache = {};
  function tmpl(str, data) {
    var fn = !/\W/.test(str) ?
      tmpl_cache[str] = tmpl_cache[str] ||
        tmpl(str) :

      new Function("__obj",
        "var __p=[],__print=function(){__p.push.apply(__p,arguments);}," +
        "__data=$.extend({},Otlet.View.template_helpers,__obj);" +
        "with(__data){__p.push('" +
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\n")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("__p.push('")
          .split("\n").join("\\'")
      + "');}return __p.join('');");

    return data ? fn(data) : fn;
  };

  var _builder = function (template) {
    this.template = tmpl(template);
  };

  var V = new JS.Class({
    include: [Otlet.Radio, Otlet.Base],
    extend: {
      get_template: function () {
        if(typeof this.template === "string")
          return this.template = _builder.call(this);
        if(!this.template_url)
          return false;

        $.ajax({
          url: this.template_url,
          async: false,
          cache: true,
          dataType: "text",
          success: _builder.bind(this)
        })
      }
    },

    render: function (data, el) {
      var html, template = this.klass.template;
      if(!Function.is(template))
        _builder.call(this.klass, template);
      
      html = this.klass.template(data);
      return el ? $(el).html(html) : html;
    },
    toString: function () {
      return "[View:" + this.klass._name + " " + this.iid + "]";
    }
  });

  Otlet.View = function (name, url) {
    if(Otlet.view[name])
      return Otlet.view[name];

    Otlet.view[name] = new JS.Singleton(V);
    Otlet.view[name].klass._name = name;
    if(url) {
      Otlet.view[name].klass.template_url = url;
      Otlet.view[name].klass.get_template();
    }

    return Otlet.view[name];
  };

  Otlet.View.template_helpers = {
    loc: function (str, lang) {
      return str.loc(lang)
    },
    link_to: function (url, html, attrs) {
      if(!url)
        return undefined;

      return $("<a/>")
        .attr("href", url)
        .html(html || url)
        .attr(attrs || {})[0]
        .outerHTML;
    },
    button: function (val, action, attrs) {
      return $('<input type="button"/>')
        .val(val)
        .click(action)
        .attr(attrs)[0]
        .outerHTML;
    },
    render_view: function (name, args, in_el) {
      name = name.replace("/", "_").camelize();
      return Otlet.view[name].render(args, in_el);
    },
    resources_dir: Titanium.Filesystem.getResourcesDirectory(),
    resource: function (f) {
      return this.resources_dir.resolve("Resources/" + f).toString();
    }
  };
})();
