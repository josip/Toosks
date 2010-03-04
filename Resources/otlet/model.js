(function () {
  var Storage = {};
  // Archive keeps objects "in memory" (coulde be Google Gears backend, etc.)
  Storage.InMemory = function () {
    this._archive = [];
    this._ids     = [];
    this._id      = "id";

    return this;
  };
  Storage.InMemory.prototype = {
    store: function (obj) {
      var id = obj[this._id];
      if(!obj || !this._isId(id) || this.has(id))
        return false;

      if(this._ids.push(id) !== this._archive.push(obj))
        this._reorganize();

      return true;
    },
    get: function (id) {
      var _id = this._id;
      if(!this._isId(id) || !this.has(id))
        return false;

      var n = this._ids.indexOf(id),
          obj = this._archive[n];
  
      if(obj && _id in obj)
        return this._archive[n];
      else {
        this._reorganize();
        return this.get(id, true);
      }
    },
    trash: function (id) {
      var _id = this._id;
      if(!this._isId(id) || !this.has(id))
        return false;

      var n = this._ids.indexOf(id),
          archived = this._archive[n];
      delete this._ids[n];

      if(archived[_id] === id)
        delete this._archive[n];
      else return false;
      return true;
    },
    lookup: function (attrs) {
      var _id = this._id;
      if(_id in attrs)
        return this.has(attrs[_id]) ? [this.get(attrs[_id])] : [];
      
      var n = this._archive.length, obj, r = [];
      while(n--) {
        if(!this._archive[n])
          continue;

        obj = $.H(this._archive[n]);
        if(obj.contains(attrs))
          r.push(this._archive[n]);
      }

      return r;
    },
    has: function (id) {
      return this._ids.contains(id);
    },
    _reorganize: function () {
      var archive = this._archive, _id = this._id;

      this._ids = [];
      this._archive = [];

      var n = archive.length, id;
      while(n--) {
        if(!archive[n])
          continue;

        var obj = archive[n];
        if(this._isId(obj[_id])) {
          this._ids.push(obj[_id]);
          this._archive.push(obj);
        }
      }

      return this;
    },
    _isId: function (id) {
      return !!id
              && typeof id !== "object"
              && typeof id !== "date";
    }
  };

  // Masks Otlet.Radio methods, adds ".<object id>" to channel name
  var FakeRadio = (function () {
    var radio_methods = ["listen", "emit", "stopListening"],
        n = radio_methods.length,
        methods = {};

    while(n--)
      (function (n) {
        var method = radio_methods[n];
        methods[method] = function () {
          arguments[0] += "." + this.id;
          return this.klass[method].apply(this.klass, arguments);
        }
      })(n)

    return new JS.Module(methods);
  })();

  var RelationManager = ({
    rmSetup: function () {
      if(this.config.belongs_to)
        this.belongs_to(this.config.belongs_to);
      if(this.config.has_one)
        this.has(this.config.has_one, 1);
      if(this.config.has_many)
        this.has(this.config.has_many, Infinity);

      this.rmSetup = undefined;
      return true;
    },
    belongs_to: function (models) {
      if(models.constructor !== Array)
        models = [models];

      var n = models.length, model, method;
      while(n--) {
        model = models[n];
        method = model.singularize().pascalize();

        this.define(method, function () {
          if(!(model in Otlet.model))
            return false;

          var id = (method + "_" + Otlet.model[model].config.key).replace(/_{1,}/, "_"),
              owner = Otlet.model[model].find(this.attribute[id]);

          return Array.is(owner) ? owner[0] : owner;
        });
      }

      return true;
    },
    has: function (models, m) {
      if(models && models.constructor !== Array)
        models = [models];

      var n = models.length,
          attr_name = this._name.singularize().pascalize() + "_" + this.config.key,
          model, method;

      attr_name = attr_name.replace(/(_){1,}/, "_");
      
      while(n--) {
        model = models[n].singularize();
        method = model.singularize().pascalize();
        if(m > 1)
          method = method.pluralize();

        this.define(method, function (attrs) {
          if(!(model in Otlet.model))
            return false;

          var n = null;
          if(!attrs)
            attrs = {};
          if(attrs.constructor !== Object) {
            if(attrs.constructor === Number)
              n = attrs;
            attrs = {};
          }

          attrs[attr_name] = this.id;
          var obj = Otlet.model[model].find(attrs);
          return n === null ? obj : obj[n];
        });
      }

      return true;
    }
  });

  var class_methods = {
    create: function (attributes) {
      var key = this.config.key;
      if(attributes.constructor !== Object) {
        var id = attributes;
        attributes = {};
        attributes[key] = id;
        delete id;
      }

      if(this.archive.has(attributes[key])) {
        var inst = new this(this.archive.get(attributes[key]));
        inst.update(attributes);
        return inst;
      }
      
      for(var attr in attributes)
        if(!this.attributes.contains(attr))
          delete attributes[attr];

      // Events listening to before_store CAN change attributes
      this.emit("before_store", attributes);
      var inst = new this(attributes);
      this.archive.store(inst.attribute);
      this.emit("new", inst);

      return inst;
    },
    find: function (attributes) {
      var key = this.config.key;
      attributes = attributes || {};
      if(arguments.length === 0)
        attributes = {};
      if(attributes.constructor !== Object) {
        var id = attributes;
        attributes = {};
        attributes[key] = id;
        delete id;
      }

      var q = this.archive.lookup(attributes), n = q.length;
      if(!q)
        return [];

      while(n--)
        q[n] = new this(q[n]);

      return q;
    },
    find_first: function (attributes) {
      return this.find(attributes)[0] || null;
    },
    filter: function () {
      console.log("Using unimplemented Model#filter method", this._name);
      // TODO: Method should filter out results from different
      // filter_methods ($find_all, $find_something...) and do Array.intersect
      // on all results (or that would be Array.combine?)
    },
    transaction: function (type, inst, req, cb) {
      if(!(type in this.config) || !this.config[type]) {
        return req.success();
      }

      if(Function.is(this.config[type]))
        return this.config[type](inst, cb);
      else {
        if(Function.is(cb))
          req.success = cb.after(req.success);
        if(!("url" in req))
          req.url = _(this.config[type].url, inst.attribute);

        return this.data_request($.extend({}, this.config[type], req));
      }
    },
    data_request: function (settings) {
      return $.ajax($.extend({
        async: true,
        global: false,
        dataType: "json",
        type: "GET"
      }, settings));
    }
  };

  var Model = new JS.Class({
    extend: [Otlet.Radio, class_methods, RelationManager],
    include: [FakeRadio],

    initialize: function (attributes) {
      this.attribute = attributes;
      var id = this.attribute[this.klass.config.key];
      this.__defineGetter__("id", function () { return id });
      
      delete this.iid;
      //this.iid = Math.floor((new Date().getTime())/Math.random()).toString(16);

      return this;
    },
    get: function (cb) {
      if($.H(this.attribute).size() >= this.klass.attributes.length) {
        if(Function.is(cb))
          cb(this);

        return this;
      }

      this.klass.transaction("get", this, {
        success: (function (resp) {
          this.update(resp);
          return this;
        }).bind(this)
      }, cb);
    },
    updateAndSave: function (obj, cb) {
      this.update($.extend(obj, {updated_at: new Date()}));
      obj = JSON.stringify(this.attribute);

      this.klass.data_request({
        url: _(this.klass.config.get.url, this.attribute),
        data: obj,
        type: "PUT",
        success: (function (resp) {
          if(resp.ok)
            this.update("_rev", resp.rev);

          this.emit("save", this);
        }).bind(this)
      }, cb);
    },
    update: function (obj) {
      if(arguments.length === 2) {
        var attr = obj;
        obj = {};
        obj[attr] = arguments[1];

        delete attr;
      }

      if($.H(obj).isEmpty())
        return this;

      var old_attrs = $.extend({}, this.attribute),
          kattrs = this.klass.attributes,
          old_val;
      for(var attr in obj) {
        // If the only attribute is "id" then assume that model
        // is scheme-less (use with caution)
        if(kattrs.length > 1 && !kattrs.contains(attr))
          continue;

        old_val = this.attribute[attr];
        if(old_val === obj[attr])
          continue;

        this.attribute[attr] = obj[attr];
        this.emit("before_store", this.attribute);
        this.emit("update", attr, obj[attr], old_val);
      }

      var diff = $.H(this.attribute).diff(old_attrs);
      if(!diff.isEmpty()) {
        this.emit("change", this, diff.hash);
        if("updated_at" in this.attribute && !obj.updated_at)
          this.attribute.updated_at = new Date();
      }

      return this;
    },
    attr: function (name) {
      return this.attribute[name];
    },
    del: function (cb) {
      this.klass.transaction("del", this, {
        success: (function (resp) {
          this.klass.archive.trash(this.id);
          this.klass.emit("delete", this);
          return this;
        }).bind(this)
      }, cb);
    },
    toString: function () {
      return "[Model:" + this.klass._name + " " + this.id + "]";
    }
  });

  Otlet.model = {};
  Otlet.Model = function (name, methods) {
    Function.validateArguments("Otlet.Model", arguments, [{
        optional: false,
        constr: String
      }, {
        optional: false,
        constr: Object,
        validateWith: function (arg) { return "$config" in arg; }
      }
    ]);

    methods.$config = $.extend({
      storage: "InMemory",
      key:      "id"
    }, methods.$config);
    methods.$attributes = methods.$attributes || [];
    methods.$attributes.insert(methods.$config.key);

    name = name.singularize().camelize();
    var model = new JS.Class(Model, Otlet.prepareClass(name, methods));
    model.archive = new Storage[model.config.storage](model.config.storage_args);
    model.archive._id = model.config.key;

    with(model) {
      turnRadioOn();
      rmSetup();

      delete turnRadioOn;
      delete rmSetup;
    }

    return this.model[name] = model;
  };
  
  Otlet.Model.filter_method = function (fn, model) {
    return function () {
      var all = (model ? Otlet.model[model] : this)["find"]({}),
          args = Array.from(arguments),
          n = all.length, filtered = [];
      
      while(n--)
        if(fn.apply(this, [all[n], n].concat(args)) === true)
          filtered.push(all[n]);
      
      return filtered.reverse();
    }
  };
  
  Otlet.Model.Storage = function (name, methods) {
    return name in Storage ? Storage[name] : Storage[name] = methods;
  };
  
  Otlet.Model.find_in_all = function(props) {
    var res = [];
    for(var model in Otlet.model)
      res = res.concat(Otlet.model[model].find(props));

    return res.clean();
  }
})();