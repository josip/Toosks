Otlet.Controller("Login", {
  main: function () {
    $(this.method("ready"));
  },
  ready: function () {
    this.controlls("#login");
    
    $("#openid_login input").not("input:submit").focus(function () {
      Otlet.Controller("Login").focusOn("openid");
    }).parent().submit(function () {
      $(this).siblings().hide("slide", {direction:"down"}, 360);
    });
    
    $("#standard_login input").not("input:submit").focus(function () {
      Otlet.Controller("Login").focusOn("standard");
    }).parent().submit(function () {
      $(this).siblings().hide("slide", {direction:"up"}, 360);
    });
    
    $(window).resize(this.method("adjustSubmitButtons")).resize();
    this.emit("ready");
    $("#openid_url")[0].focus();
  },
  focusOn: function (method) {
    var focus = $("#login #" + method + "_login"),
        hide  = $("#login #" + (method == "openid" ? "standard" : "openid") + "_login");

    if(focus.css("opacity") == 1 && hide.css("opacity") == 0.4)
      return false;

    hide.animate({opacity: 0.4}, 120).find("input:submit").hide("slide", {}, 120);
    focus.animate({opacity: 1}, 360).find("input:submit").show("slide", {}, 360);
  },
  adjustSubmitButtons: function () {
    var oid       = $("#openid_login input:submit"),
        oid_panel = oid.parent().offset(),
        std       = $("#standard_login input:submit"),
        std_panel = std.parent().offset(),
        offset    = $.browser.safari ? 173 : 175;
        
    oid.css({top: oid_panel.top, left: oid_panel.left + offset});
    std.css({top: std_panel.top, left: std_panel.left + offset});
  }
});