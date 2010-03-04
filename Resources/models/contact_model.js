Otlet.Model("Contact", {
  $config: {
    key: "nick",
    has_many: "Tasks",
    has_one: "Location"
  },
  $attributes: [
    "nick", "full_name", "email",
    "location_id", "photo_path", "list_position",
    "created_at", "updated_at", "fields"
  ],
  $trashable: true,
  $faves: Otlet.Model.filter_method(function (i, n) {
    return i.attr("list_position") !== null;
  }),
  $me: function () {
    return this.find_first("@me".loc());
  },
  
  photo: function () {
    return this.attr("photo_path") || "images/icons/user.png";
  },
  is_fave: function () {
    return this.attr("list_position") !== null;
  },
  field: function (k) {
    return this.attr("fields").get(k);
  },
  set_field: function (k, v) {
    this.update("fields", $.H(this.attr("fields")).set(k, v));
    return this;
  }
});
Otlet.model.Contact.SQLiteStore = new Otlet.SQLiteStore("Contact", "nick", {
  nick:           "TEXT PRIMARY KEY",
  full_name:      String,
  email:          String,
  location_id:    String,
  photo_path:     String,
  fields:         Hash,
  list_position:  Number,
  created_at:     Date,
  updated_at:     Date
});
Otlet.model.Contact.SQLiteStore.should_listen_to_model_events = true;