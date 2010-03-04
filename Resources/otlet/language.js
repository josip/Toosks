(function () {
  var langs = [], current;

  function index_of_lang (code, loc) {
    var n = langs.length;
    
    while(n--) {
      var lang = langs[n];
      if(lang.code == code && lang.loc == loc)
        return n;
    }
    
    return -1;
  };
  
  function _update_calendar_translations (lang) {
    if(lang.days)
      Date.days = lang.days;
    if(lang.months)
      Date.months = lang.months;

    return true;
  }

  Otlet.Language = function (name, strings) {
    if(arguments.length < 1)
      return langs[current];
    if(arguments.length == 1)
      return langs[index_of_lang(name)];

    name = name.toLowerCase().split("-", 2);
    var lc = strings._lc,
        days = strings._days,
        months = strings._months;
    if(lc)
      delete strings._lc;
    if(days)
      delete strings._days;
    if(months)
      delete strings._months;

    langs.push({
      code: name[0],
      locality: name[1],
      local_name: lc,
      strings: strings,
      days: days,
      months: months
    });

    return true;
  };

  Otlet.Language.use = function (name) {
    name = name.toLowerCase().split("-", 2);
    var code = name[0],
        locality = name[1],
        n = langs.length,
        code_match, lang;

    while(n--) {
      lang = langs[n];
      if(lang.code == code)
        if(lang.locality == locality) {
          _update_calendar_translations(lang);
          return !!(current = n) || true;
        } else
          code_match = n;
    }

    if(code_match === undefined)
      return false;
    else {
      current = code_match;
      return _update_calendar_translations(lang);
    }
  };

  Otlet.Language.current = function () {
    return current !== undefined ? langs[current].code : undefined;
  };

  $.fn.localize = function () {
    $(this).find(".loc").each(function () {
      var $this = $(this),
          text  = $this.text().trim(),
          val   = $this.val().trim(),
          title = $this.attr("title").trim();

      if(text)
        $this.text(text.loc());
      if(val)
        $this.val(val.loc());
      if(title)
        $this.attr("title", title.loc());
    });

    return this;
  };

  JS.extend(String.prototype, {
    loc: function (n) {
      n = n ? index_of_lang(n) : current;
      return n > -1 ? langs[n].strings[this] || "_" + this : "_" + this;
    }
  });

  /*
  window._ = (function (str) {
    if(str && str.charAt(0) == "@")
      arguments[0] = str.slice(1).loc();

    return arguments;
  }).before(window._); */
})()