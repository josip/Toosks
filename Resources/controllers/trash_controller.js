(function () {
/*** Controller definition ***/
Otlet.Controller("Trash", {
  initialize: function () {
    this.trashcan_anim = new Otlet.util.PNGAnim("#trashcan_anim", 48, 3);
    this.trashable_docs = [];
    this.empty_trash_sound = null;

    /*
    if("Titanium" in window)
      this.empty_trash_sound = Titanium.Media.createSound("app://sounds/empty_trash.mp3");
    else
      this.empty_trash_sound = false;
    */

    for(var model in Otlet.model)
      if(Otlet.model[model].trashable)
        this.trashable_docs.push(model.toLowerCase());

    if(!$.is_ready)
      Otlet.Application.listen("ready", this.ready, this);
  },
  ready: function () {
    $("#trash_drop").droppable({
      tolerance: "touch",
      hoverClass: "drop",
      accept: this.methodFor$("_should_accept"),
      drop: this._something_fell_in,
      activate: this.methodFor$("_open_trash"),
      deactivate: this.methodFor$("_close_trash")
    });
  },
  
  index: function () {
    var n = this.trashable_docs.length;
    while(n--)
      $("." + this.trashable_docs[n]).effect("highlight", {color: "#ffa"}, "slow");
  },

  _open_trash: function () {
    with(this.trashcan_anim) {
      delay = 50;
      stop();
      el.style.backgroundPositionX = "0px";
      play();
    }
  },
  _close_trash: function () {
    with(this.trashcan_anim) {
      delay = 30;
      stop();
      el.style.backgroundPositionX = "-10px";
      play();
    }
  },
  _should_accept: function (handle, el) {
    var classes = el[0].className.split(" "),
        n = classes.length;

    while(n--)
      if(this.trashable_docs.contains(classes[n]))
        return true;

    return false;
  },
  _something_fell_in: function (e, ui) {
    ui.draggable
      .fadeOut(120, $.removeWhenDone)
      .parent()
        .find(".ui-sortable-placeholder")
          .css("outline", "1px solid red");

    Otlet.util.poof("#trashcan_anim");

    var _tmp = ui.draggable[0].id.split("_", 2),
        id = isNaN(+_tmp[1]) ? _tmp[1] : +_tmp[1],
        model = Otlet.model[_tmp[0].firstToUpperCase()].find_first(id);

    if(this.empty_trash_sound && !this.empty_trash_sound.isPlaying())
      this.empty_trash_sound.play();

    model.del();
  }
});

})()