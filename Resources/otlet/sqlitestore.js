(function () {
  if(!("openDatabase" in window))
    return false;

  var DB = window.openDatabase("OtletModelStorage", "1.0"),
      DB_IS_LOCKED = false,
      DB_QUEUE = [];

  if(!DB)
    throw new Error("Could not open database");

  function DB_LOCK () {
    DB_IS_LOCKED = false;
  }
  
  function DB_UNLOCK () {
    DB_IS_LOCKED = false;
    var q = DB_QUEUE;

    while(q.length) {
      var tx = DB_QUEUE.shift();
      if(tx)
        tx[0]._exec.apply(tx[0], tx[1]);
    }
  }

  var PRIMITIVE_TYPES = ["NULL", "INTEGER", "REAL", "TEXT", "CHAR", "VARCHAR", "DATE", "BLOB"];
  Otlet.SQLiteStore = function (name, id, columns) {
    this._table_name = name.pluralize();
    this._columns = new Hash(columns);
    this._id = id || "id";
    this.should_listen_to_model_events = false;
    this._highest_id = 0;

    this._columns.map(function (k, v) {
      return String.is(v) ? v : v.name;
    }, !!"direct");

    this._create_table();
    this._add_store_and_create_method();
    return this;
  };
  
  Otlet.SQLiteStore.prototype = {
    _exec: function (query, query_vals, cb, error_cb) {
      if(DB_IS_LOCKED)
        return DB_QUEUE.push([this, arguments]);
      else
        DB_LOCK();

      DB.transaction(function (tx) {
        console.log("SQL:", query);
        var r = tx.executeSql(query, query_vals, function (tx, results) {
          DB_UNLOCK();
          if(Function.is(cb))
            cb(tx, results);
        }, function (tx, error) {
          if(error.code !== 1)
            DB_UNLOCK();
          if(Function.is(error_cb))
            error_cb(tx, error);
          else
            on_error(tx, error);
        });
        
      });
    },
    _select: function (props, where, cb, err_cb) {
      var self = this, where_q;
      where = $.H(where);
      if(!props)
        props = "*";
      if(Array.is(props))
        props = props.join(", ");
      if(!where.size())
        where_q = "";
      else
          where_q = " WHERE " + where.asString({
          equal: "=",
          delimiter: " AND ",
          value_escape: ["", "", function () { return "?" }]
        });

      var query = "SELECT " + props + " FROM " + this._table_name + where_q;
      this._exec(query, where.values(),
        function (tx, result) {
          var set = new Array(result.rows.length),
              l = n = result.rows.length;

          while(n--)
            set[n] = $.H(result.rows.item(n)).map(function (k, v) {
              return TypeTransformer.from_db(self._columns.get(k), v);
            }).hash;

          cb(set, l, result, tx);
        }, err_cb
      );
    },
    _insert: function (data, cb, err_cb) {
      data = $.H(data);
      var self    = this,
          columns = data.keys(),
          values  = data.values().map(function (v, n) {
            return TypeTransformer.for_db(self._columns.get(columns[n]), v);
          }),
          val_q = values.map(function () { return "?" }).join(", ");

      columns = columns.join(", ");
      this._exec(
        _("INSERT OR REPLACE INTO {0} ({1}) VALUES ({2})", [this._table_name, columns, val_q]),
        values, cb, err_cb
      );
    },
    _update: function (id, data, cb, err_cb) {
      data = $.H(data);
      var self = this,
          props = data.keys(),
          values = data.map(function (k, v) {
            return TypeTransformer.for_db(self._columns.get(k), v);
          }).values(),
          updates = data.asString({
            equal: "=",
            delimiter: ", ",
            value_escape: ["", "", function () { return "?" }]
          });

      this._exec(_("UPDATE {0} SET {1} WHERE {2}=?", [
        this._table_name, updates, this._id
      ]), values.concat(id), cb, err_cb);
    },
    _create_table: function () {
      var self = this;
      this._select("COUNT(*)", null, function () {
        self._restore();
      }, function (tx, error) {
        var props = self._columns.map(function (k, v, h) {
          return TypeTransformer.type_for_db(self._columns.get(k));
        }).asString({
          equal: " ",
          delimiter: ", "
        });
        self._exec("CREATE TABLE " + self._table_name +" (" + props + ")", [], function () {
          self._restore();
        });
      });
    },
    _restore: function () {
      var self = this;
      this._select("*", null, function (items, n) {
        var model_name = self._table_name.singularize(),
            model = Otlet.model[model_name],
            id = self._id;

        while(n--) {
          var id = model.create(items[n]).id;
          if(id > self._highest_id)
            self._highest_id = id;
        }

        model._restored = true;
        model.emit("restored", model);
        self._listen_to_model_events();
      });
    },
    _listen_to_model_events: function () {
      if(!this.should_listen_to_model_events)
        return false;

      var self = this,
          model_name = this._table_name.singularize(),
          model = Otlet.model[model_name];

      model.listen("new", function (e, inst) {
        self.store(inst.attribute);
      });
      model.listen("change", function (e, inst, changed) {
        var id = inst.id;
        inst = inst.attribute;
        self.update(id, $.H(changed).map(function (k, v) { return inst[k] }));
      });
      model.listen("delete", function (e, inst) {
        self.del(inst.id);
      });
    },
    _add_store_and_create_method: function () {
      var self = this,
          model_name = this._table_name.singularize(),
          model = Otlet.model[model_name],
          id = model.config.key,
          auto_inc_id = TypeTransformer.type_for_db(this._columns.get(this._id));

      auto_inc_id = auto_inc_id.contains("INTEGER") || auto_inc_id.contains("REAL");
      model.storeAndCreate = function (attrs) {
        attrs.type = model_name;
        attrs.created_at = attrs.created_at || new Date();
        attrs.updated_at = attrs.updated_at || new Date();
        if(!attrs[id] && auto_inc_id)
          attrs[id] = ++self._highest_id;
        return model.create(attrs);
      }
    },
    get: function (id, cb, error_cb) {
      this._select("*", {id: id}, function (res, l) {
        cb(res[0], l);
      }, error_cb);
    },
    has: function (id, cb, error_cb) {
      var props = $.H({}).set(this._id, id).hash;

      this._select("COUNT(*) AS count", props, function (set, l) {
        cb(set[0].count > 0, set);
      }, error_cb);
    },
    store: function (data, cb, err_cb) {
      this._insert(data, cb, err_cb);
    },
    update: function (id, data, cb, err_cb) {
      this._update(id, data, cb, err_cb);
    },
    del: function (id, cb, err_cb) {
      this._exec(
        _("DELETE FROM {0} WHERE {1}=?", [this._table_name, this._id]),
        [id], cb, err_cb
      );
    },
  };

  var TypeTransformer = {
    transformers: {},
    type_map: $.H({}),
    add: function (type, m) {
      this.type_map.set(type, m.as);
      this.transformers[type] = m;
    },
    type_for_db: function (column_def) {
      var type = column_def.split(" ", 2)[0];

      if(PRIMITIVE_TYPES.contains(type))
        return column_def;
      else {
        if(!this.type_map.has(type))
          throw new Error("No type transformer for " + type);
        return this.type_map.get(type);
      }
    },
    for_db: function (column_def, val) {
      if(val === null) return val;
      var type = column_def.split(" ", 2)[0];
      return this.type_map.has(type) ? this.transformers[type].for_db(column_def, val) : val;
    },
    from_db: function (column_def, val) {
      if(!column_def || val === null) return val;
      var type = column_def.split(" ", 2)[0];
      return this.type_map.has(type) ? this.transformers[type].from_db(column_def, val) : val;
    }
  };
  
  with(TypeTransformer) {
    add("Boolean", {
      as: "INTEGER",
      for_db: function (c, val)       { return +val;  },
      from_db: function (c, nr)       { return !!nr;  }
    });

    add("String", {
      as: "TEXT",
      for_db: function (c, str)       { return str; },
      from_db: function (c, str)      { return str; }
    });

    add("Number", {
      as: "REAL",
      for_db: function (c, n)         { return n; },
      from_db: function (c, n)        { return n; }
    });

    add("Date", {
      as: "INTEGER",
      for_db: function (c, date)      { return +date; },
      from_db: function (c, int)      { return new Date(int); }
    });

    add("Object", {
      as: "TEXT",
      for_db: function (c, obj)       { return JSON.stringify(obj); },
      from_db: function (c, txt)      { return JSON.parse(txt); }
    });
    add("Array", transformers.Object);

    add("Hash", {
      as: "TEXT",
      for_db: function (c, h)         { return JSON.stringify(h.hash); },
      from_db: function (c, txt)      { return $.H(JSON.parse(txt)); }
    });
  }

  Otlet.SQLiteStore.add_transformer = TypeTransformer.add.bind(TypeTransformer);

  function on_error(tx, error) {
    if(console) console.error("SQLite error:", error.message);
  }
})()
