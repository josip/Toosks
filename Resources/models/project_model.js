Otlet.Model("Project", {
  $config: {
    key: "hashtag",
//    has_many:   "Tasks",
  },
  $attributes:  ["hashtag", "title", "list_position", "colour", "created_at", "updated_at"],
  $trashable:   true,
  $find_by_hashtag: function (hashtag) {
    return this.find({hashtag: hashtag});
  },

  tasks: Otlet.Model.filter_method(function (i, n) {
    var project = i.project();
    return project ? project.id === this.id : false;
  }, "Task"),
  unfinished_tasks: Otlet.Model.filter_method(function (i, n) {
    var project = i.project(), done_state = Otlet.model.Task.TASK_DONE;
    return project ? project.id === this.id && i.attr("state") < done_state : false;
  }, "Task"),
  has_unfinished_tasks: function () {
    var tasks = this.tasks(), done_state = Otlet.model.Task.TASK_DONE;
    if(!tasks) return false;

    var n = tasks.length;
    while(n--)
      if(tasks[n].attr("state") < done_state)
        return true;

    return false;
  },
  locations: function () {
    var tasks = Otlet.util.sortByListPositionAsc(this.unfinished_tasks()),
        m = Array.is(tasks) ? tasks.length : 0,
        n = 0,
        locations;

    if(!m)
      return [];

    locations = [];
    for(; n < m; n++)
      // Faster than initializing empty array with n elements
      // and then setting locations[n] = ..., because then we would need
      // to .flatten() final array, which takes some time
      locations = locations.concat(tasks[n].locations());

    return locations;
  }
});

Otlet.model.Project.SQLiteStore = new Otlet.SQLiteStore("Project", "hashtag", {
  hashtag:        "TEXT PRIMARY KEY",
  title:          String,
  list_position:  Number,
  colour:         String,
  created_at:     Date,
  updated_at:     Date
});
Otlet.model.Project.SQLiteStore.should_listen_to_model_events = true;
