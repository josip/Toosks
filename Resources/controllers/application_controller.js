(function () {
/*** Controller ***/
Otlet.Controller("Application", {
  $private: ["updates", "ready"],
  initialize: function () {
    Otlet.Language.use("en");
    this.ready_models = [];

    this.listen("url_source_change", this.method("_url_source_changed"));
    if("Titanium" in window) {
      this.dock_menu = Titanium.UI.createMenu();
      Titanium.UI.setDockMenu(this.dock_menu);
      this.file_menu = Titanium.UI.createMenu();
    }
    $(window).resize(this._resized_window);
  },
  ready: function () {
    $("body").localize();
    $("#working")
      .css("left", window.innerWidth/2 - $("#working").width()/2);

    this.emit("ready");

    Otlet.Controller.init("Trash");

    Otlet.observe_url_changes();
    $("#working").fadeOut(360);
    window.location.hash = "Tasks";
  },
  _url_source_changed: function (e, current, previous) {
    if(Function.is(current))
      return false;

    var ctrl = current.klass._name.toLowerCase();
    $("#" + ctrl + "_menu_item")
      .addClass("active")
      .siblings()
        .removeClass("active");
    $("#" + ctrl + ".page").show().siblings().hide();
  },
  _resized_window: function () {
    var h = window.innerHeight - $("#navigation")[0].clientHeight;
    $(".sidebar").height(h);
    $(".body").height(h);
  }
});
})()