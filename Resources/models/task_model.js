(function () {
var PROJECT_REGEXP  = /\[([\w|-]+)\]/g,
    CONTACT_REGEXP  = /\@(\w+)/g,
    PLACE_REGEXP    = /\#([\w|-]+)/g,
    PRIORITY_REGEXP = /\!/g,
    DATE_REGEXP     = /\{(.+)\}/g;

Otlet.Model("Task", {
  $TASK_UNFINISHED:       0,
  $TASK_INPROGRESS:       1,
  $TASK_DONE:             2,
  $TASK_NO_PRIORITY:      0,
  $TASK_LOW_PRIORITY:     1,
  $TASK_MEDIUM_PRIORITY:  2,
  $TASK_HIGH_PRIORITY:    3,

  $config: {
    key:        "id",
    has_many:   ["Notes"]
  },
  $attributes:  ["id", "body", "state", "list_position", "started_working_on", "created_at", "updated_at"],
  $trashable:   true,
  
  $find_by_project: Otlet.Model.filter_method(function (i, n, p) {
    var iproj = i.project();
    return iproj.id === String.is(p) ? p : p.id;
  }),
  $find_unfinished: Otlet.Model.filter_method(function (i, n) {
    return i.attr("state") < this.TASK_DONE;
  }),
  $find_finished: function () {
    return this.find({state: this.TASK_DONE});
  },
  $find_all_for_date: function (date, comparison) {
    var tasks = this.find(),
        n = tasks.length,
        result = [],
        task, due_date;

    date = date.getTime();
    while(n--)
      if((task = tasks[n])
      && (due_date = task.due_date())
      && (due_date.getTime() == date))
        result.push(task);

    return result;
  },
  $find_all_for_today: function () {
    return this.find_all_for_date(Date.today());
  },

  project: function () {
    if("_project" in this && this._project)
      return this._project;

    this._project = this.attr("body").match(PROJECT_REGEXP);
    if(this._project)
      this._project = this._project[0].slice(1, -1) || "inbox";
    else
      this._project = "inbox";

	  return this._project = Otlet.model.Project.find_first({hashtag: this._project});
  },
  update_project: function (proj, save) {
    var hashtag = proj;
    if(typeof(proj) == "string")
      proj = Otlet.model.Project.find_by_hashtag(hashtag)[0];
    else
      hashtag = proj.attr("hashtag");
    
    hashtag = hashtag.wrap("[]");
    var prev_hashtag = this.project().attr("hashtag").wrap("[]"),
        body = this.attr("body");
  
    if(hashtag == "[inbox]")
      body = body.replace(prev_hashtag + " ", "");
    else if(prev_hashtag == "[inbox]")
      body = hashtag + " " + body;
    else
      body = body.replace(prev_hashtag, hashtag);
    
    this[save ? "updateAndSave" : "update"]({body: body.trim()});
    return this._project = proj;
  },
  is_finished: function () {
    return this.attr("state") === this.klass.TASK_DONE;
  },
  priority: function () {
    var matches = this.attr("body").match(PRIORITY_REGEXP);
    if(!matches) return this.klass.TASK_NO_PRIORITY;
    
    matches = matches.length;
    if(matches == 1) return this.klass.TASK_LOW_PRIORITY;
    if(matches == 2) return this.klass.TASK_MEDIUM_PRIORITY;
    if(matches >= 3) return this.klass.TASK_HIGH_PRIORITY;
  },
  locations: function () {
    var matches = this.attr("body").match(PLACE_REGEXP),
        n = Array.is(matches) ? matches.length : 0,
        locations;

    if(!n)
      return [];

    locations = new Array(n);
    while(n--)
      locations[n] = Otlet.model.Location.find_first(matches[n].slice(1)) || undefined;

    return locations.clean();
  },
  due_date: function () {
    var dates = this.attr("body").match(DATE_REGEXP);
    if(!Array.is(dates) || !dates.length)
      return false;
    
    return new Date(dates[0].slice(1, -1));
  }
});
Otlet.model.Task.SQLiteStore = new Otlet.SQLiteStore("Task", "id", {
  id:             "REAL PRIMARY KEY",
  body:           String,
  state:          Number,
  list_position:  Number,
  started_working_on: Date,
  created_at:     Date,
  updated_at:     Date
});
Otlet.model.Task.SQLiteStore.should_listen_to_model_events = true;

Otlet.model.Task.listen("before_store", function (e, attrs) {
  var d = Date.today();
  attrs.body = attrs.body.replace(DATE_REGEXP, function (c, date) {
    date = date.toLowerCase();
    if(Number.is((new Date(date)).getTime()))
      return (new Date(date)).toString().wrap("{}");

    var date_spl = date.split("."),
        is_day = Date.days.indexOf(date.firstToUpperCase()),
        is_month = Date.months.indexOf(date.firstToUpperCase());

    if(date === "today".loc())
      return d.toString().wrap("{}");
    if(date === "tomorrow".loc()) {
      d.setDate(d.getDate() + 1);
      return d.toString().wrap("{}");
    }
    if(is_day !== -1) {
      d.setFullYear(d.getFullYear(), d.getMonth(), d.getDate() + is_day - d.getDay());
      return d.toString().wrap("{}");
    } else if(is_month !== -1) {
      d.setFullYear(d.getFullYear(), is_month, 1);
      return d.toString().wrap("{}")
    }
    if(date_spl.length == 2) {
      d.setFullYear(d.getFullYear(), d.getMonth(), +date_spl[0]);
      return d.toString().wrap("{}");
    } else if(date_spl.length === 3) {
      return (new Date(d.getFullYear(), (+date_spl[1])-1, +date_spl[0])).toString().wrap("{}");
    } else if(date_spl.length === 4) {
      return (new Date(+date_spl[2], (+date_spl[1])-1, +date_spl[0])).toString().wrap("{}");
    }
  });
});

var formatters = {};
formatters[PROJECT_REGEXP.toString().slice(1, -2)] = "";
formatters[PLACE_REGEXP.toString().slice(1, -2)] = function (c, id) {
  var title = Otlet.model.Location.find_first(id);
  title = title ? title.attr("title") : id;
  if(!title.length) title = id;

  return _('<a href="#Places/show/{0}" title="#{0}" class="place">{1}</a>', [id, title]);
};
formatters[CONTACT_REGEXP.toString().slice(1, -2)] = function (c, nick) {
  var name = Otlet.model.Contact.find_first(nick);
  name = name ? name.attr("full_name") : nick;
  if(!name.length) name = nick;
  
  return _('<a href="#Contacts/show/{0}" title="@{0}" class="contact">{1}</a>', [nick, name]);
};
formatters[DATE_REGEXP.toString().slice(1, -2)] = function (c, date_str) {
  var date = new Date(date_str),
      date_at_midnight = (new Date(date_str)).atMidnight(),
      midnight_time = date_at_midnight.getTime(),
      today_time = Date.today().getTime(),
      week = midnight_time - today_time,
      formatted;

  if(midnight_time == today_time)
    formatted = "today".loc().firstToUpperCase().wrap("<strong>", "</strong>");
  else if(midnight_time == Date.tomorrow().getTime())
    formatted = "tomorrow".loc().firstToUpperCase();
  else if(midnight_time == Date.yesterday().getTime())
    formatted = "yesterday".loc().firstToUpperCase();
  else if(week >= 0 && week < 604800000)
    formatted = date.format("{D}");
  else
    formatted = date.format("{D}, {d}.{M}.");

  return '<span class="date" title="' + date.toString() + '">' + formatted + '</span>';
};
$.extend(Otlet.View.template_helpers.body_formatter.formatters, formatters);
})()