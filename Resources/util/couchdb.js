return false;

(function () {
  Otlet.util.CouchDB = {};

  var _getAll_cb = function (resp) {
    var r = resp.rows;
    if(!r.length)
      return false;

    for(var n = 0, m = r.length; n < m; n++) {
      var i = r[n].value;
      Otlet.model[i.type].create(i);
    }
    
    if(r[0] && r[0].value)
      Otlet.model[r[0].value.type].emit("fetched_all");
  };

  Otlet.util.CouchDB.getAll = function (model, query) {
    query = query || {};
    return function (add_query) {
      $.ajax({
        async: false,
        type: "GET",
        url: "/toosks/_design/toosks/_view/all_" + model.toLowerCase().pluralize(),
        data: add_query ? $.extend({}, add_query, query) : query,
        dataType: "json",
        success: _getAll_cb,
        cache: true
      })
    }
  }
  
  Otlet.util.storeAndCreate = function (attributes) {
    attributes.type = this._name;
    attributes.created_at = new Date();
    attributes.updated_at = attributes.created_at;

    attributes = JSON.stringify(attributes);

    var id, full_attributes;
    $.ajax({
      async: false,
      type: "POST",
      dataType: "json",
      data: attributes,
      url: this.config.create.url,
      success: function (resp) {
        if(resp.ok)
          id = resp.id;
        return true; 
      }
    });
    
    $.ajax({
      async: false,
      type: "get",
      dataType: "json",
      url: [this.config.create.url, id].toURL(),
      success: function (resp) {
        full_attributes = resp;
        return true;
      }
    });

    this.emit("stored", this);
    return this.create(full_attributes);
  };
  
  function _bulkUpdate_cb (resp) {
    resp = JSON.parse(resp.responseText);
    if(resp.error)
      return this.active = false;

    var n = resp.length, doc, i;
    while(n--) {
      doc = resp[n];
      if(i = Otlet.Model.find_in_all(doc.id)[0])
        i.update({_rev: doc.rev});
    }

    if(Function.is(this.callback))
      this.callback(resp);

    if(this.clear_after_update)
      this.clear();

    this.active = false;
  }

  Otlet.util.CouchDB.BulkUpdate = new JS.Class({
    initialize: function (db, model) {
      this.db       = db;
      this.docs     = [];
      this._on_hold = [];
      this.model    = model;
      this.clear_after_update = false;
      
      return this;
    },
    add: function (doc) {
      if(!doc)
        return false;

      var docs = this[this.active ? "_on_hold" : "docs"],
          n = docs.length,
          id = doc.id;

      while(n--)
        if(docs[n] && docs[n].id === id)
          return docs[n] = doc;

      return docs.push(doc) > 0;
    },
    clear: function () {
      this.docs = this._on_hold;
      this._on_hold = [];
      return this;
    },
    update: function () {
      if(this.active)
        return false;

      var docs = this.docs,
          n = this.docs.length;
      if(!n)
        return false;

      this.active = true;
      while(n--)
        if(docs[n])
          docs[n] = docs[n].attribute;

      $.ajax({
        type: "POST",
        url: "/" + this.db + "/_bulk_docs",
        data: JSON.stringify({docs: docs}),
        dataType: "json",
        complete: _bulkUpdate_cb.bind(this)
      });
    }
  });
  
  Otlet.util.CouchDB.update_sortable_list = function (model, finder) {
    return function (ui) {
      var $this = $(this),
          list = $this.sortable("toArray"),
          n = list.length,
          obj;

      while(n--) {
        obj = finder(list[n], $this);
        if(!obj || obj.attr("list_position") === n)
          continue;

        obj.update({list_position: n});
        Otlet.Application.updates.add(obj);
      }
    }
  }
})()