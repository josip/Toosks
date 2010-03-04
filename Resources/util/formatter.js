(function () {  
  Otlet.View.template_helpers.body_formatter = function (body) {
    var formatters = this.body_formatter.formatters;
    for(var regexp in formatters)
      body = body.replace(new RegExp(regexp, "g"), formatters[regexp]);

    return body.trim();
  };
  
  Otlet.View.template_helpers.body_formatter.formatters = {};
  Otlet.View.template_helpers.body_formatter.add_formatter = function (p, r) {
    p = String.is(p) ? p : p.toString().slice(1, -2);
    Otlet.View.template_helpers.body_formatter.formatters[p] = r;
  }

  with(Otlet.View.template_helpers.body_formatter) {
    add_formatter(/\&/g, "&amp;");
    add_formatter(/\"/g, "&quot;");
    add_formatter(/\</g, "&lt;");
    add_formatter(/\>/g, "&gt;");
    add_formatter(/(\ ){2,}/g, "&nbsp;&nbsp;");
    add_formatter(
      /(ftp|http|https|file):\/\/[\w\&\?\.\+\/=:;%-]+(\b|$)/g, '<a href="$&" target="ti:systembrowser">$&</a>'
    );
    add_formatter(/(\n)/g, "<br/>");
//    "\\*(.*)\\*": "<strong>$1</strong>",
//    "\\_(.*)\\_": "<em>$1</em>",
  }
  
})()
