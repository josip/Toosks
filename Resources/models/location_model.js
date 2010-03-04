Otlet.Model("Location", {
  $config: {
    key: "hashtag",
    has_many: "Tasks"
//    has_one: "Contact"
  },
  $attributes: [
    "hashtag", "title", "descrip",
    "lat", "lng",
    "created_at", "updated_at"
  ],
  $trashable: true,
  $home: function () {
    return this.find_first("@me".loc() + "-" + "#home".loc());
  },
  
  coords: function () {
    return this.attr("lat") + "," + this.attr("lng");
  },
  contact: function () {
    if("_contact" in this)
      return this._contact;
    else
      return this._contact = Otlet.model.Contact.find_first(this.id.split("-" + "#home".loc())[0]);
  }
});

Otlet.model.Location.SQLiteStore = new Otlet.SQLiteStore("Location", "hashtag", {
  hashtag:        "TEXT PRIMARY KEY",
  title:          String,
  descrip:        String,
  lat:            Number,
  lng:            Number,
  created_at:     Date,
  updated_at:     Date
});
Otlet.model.Location.SQLiteStore.should_listen_to_model_events = true;
