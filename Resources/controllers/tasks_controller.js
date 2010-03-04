Otlet.Controller("Tasks", {
  $private: ["formSubmit", "ready"],
  initialize: function () {
    if(!Project._restored || !Task._restored) {
      Project.listen("restored",  this.method("initialize"));
      Task.listen("restored",     this.method("initialize"));
      return this;
    }
    
    this.current_project = Project.create({
      hashtag: "inbox",
      title: "inbox".loc()
    });

    if(!$.is_ready)
      Otlet.Application.listen("ready", this.ready, this);

    Task.listen("new",        newTask,        this);
    Task.listen("change",     changeTask,     this);
    Task.listen("delete",     deleteTask,     this);
    Project.listen("new",     newProject,     this);
    Project.listen("delete",  deleteProject,  this);

    updateTotalUnfinishedTasks();

    if(Otlet.Application.dock_menu)
      Otlet.Application.dock_menu.addItem("New Task", this.method("quickAdd"));
  },
  ready: function () {
    $("#content").append(this.render("index", {}));
    $("#tasks_body form.update textarea").labelify({labelledClass: "label"});
    this.controlls("div#tasks.page").siblings().hide();

    listProjects();

    this.container
      .find("div#tasks_body.body form.update")
        .submit(this.methodFor$("formSubmit"));

    this.container.find(NEW_TASK_BODY_EL).keypress(function (e) {
      if(e.keyCode === Event.KEY_RETURN)
        return $(this).parent().submit() && Event.kill(e);
    });

    $(window).resize();

    this.container
      .find("div.sidebar #projects")
      .sortable({
        cancel: ".editor",
        delay: 120,
        distance: $("#projects li.project:first").height()/2,
        update: Otlet.util.update_sortable_list("Project", function (i) {
          return Project.find_first(i.split("_", 2)[1]);
        }),
        start: Otlet.util.sortableStartInSidebar,
        beforeStop: Otlet.util.sortableBeforeStopInSidebar,
        revert: 120
      });

    this.container
      .find(TASKS_EL)
      .sortable({
        handle: "ul.actions li.handle",
        update: Otlet.util.update_sortable_list("Task", function (i) {
          return Task.find_first(+i.split("_", 2)[1]);
        }),
        start: Otlet.util.sortableStart,
        beforeStop: Otlet.util.sortableBeforeStop,
        /* There is no clean way to cancel revert animation
         * when task is dragged to other project and should be hidden afterwards
         */
        revert: false
      });

    this.container
      .find(TASKS_EL + " input[type=checkbox]")
      .live("click", taskCheckboxClicked);

    this.container
      .find(TASKS_EL + " li.task p.task_body")
      .live("dblclick", taskShowEditingForm);

    this.container
      .find(TASKS_EL + " li.task.editor textarea")
      .live("keypress", taskEditingFormCallback);
  },
  index: function () {
    this.project("inbox");
  },
  project: function (id, include_finished) {
    var project = id;
    if(String.is(id))
      project = Project.find_first(id);

    this.container.find("#tasks_body").removeClass("for_journal").addClass("for_project");
    this.current_project = project || this.current_project;
    var tasks = this.current_project ? this.current_project.tasks() : [];

    if(this.container)
      this.activeSidebarItem = findProjectElement();

    if(!tasks.length)
      $(TASKS_EL).html("");

    var n = tasks.length;
    while(n--)
      if(tasks[n].is_finished() && include_finished !== true)
        tasks[n] = undefined;

    this.render("task", {
      tasks: Otlet.util.sortByListPositionAsc(tasks.clean())
    }, TASKS_EL);
    return tasks;
  },
  journal: function () {
    this.container.find("#tasks_body").removeClass("for_project").addClass("for_journal");
    this.activeSidebarItem = this.container.find(".sidebar a[href$=/journal]");
    
    var tasks = Task.find_finished();
    this.render("task", {
      tasks: Otlet.util.sort_by("updated_at", "desc", tasks)
    }, TASKS_EL);
  },
  today: function () {
    this.container.find("#tasks_body").removeClass("for_journal").addClass("for_project");
    this.activeSidebarItem = this.container.find(".sidebar a[href$=/today]");
    
    var tasks = Task.find_all_for_today();
    this.render("task", {
      tasks: Otlet.util.sort_by("updated_at", "desc", tasks)
    }, TASKS_EL);
  },
  createProject: function () {
    Otlet.ignore_next_url_change();
    window.location.hash = "Tasks/project/" + C().current_project.id;
    
    if($("#projects li.editor").length)
      return $("#projects li.editor:first").fadeOut(180, $.removeWhenDone);

    $("#projects").prepend(C().render("create_project"));
    $("#projects li.editor:first a input").keyup(createProjectTextFieldCallback);
    $("#projects li.editor:first").fadeIn(180, function () {
      $(this).find("input[type=text]")[0].focus()
    });
  },
  formSubmit: function (e) {
    if(e) Event.kill(e);

    var txa = this.container.find(NEW_TASK_BODY_EL),
        body = txa.val().trim();
    
    if(!body.length)
      return false;

    if(this.current_project.id !== "inbox" && !body.contains("["))
      body = this.current_project.id.wrap("[]") + " " + body;

    Task.storeAndCreate({
      body:   body,
      state:  Task.TASK_UNFINISHED,
      list_position: -1
    });

    txa.val("");
    return false;
  },
  deleteAll: function () {
    var tasks = [];
    if(this.container.find("#tasks_body").hasClass("for_journal"))
      tasks = Task.find_finished();
    else
      tasks = this.current_project.tasks();
  
    var n = tasks.length;
    this.container.find(tasks_body).html("");
    while(n--)
      tasks[n].del();
  },
  notes: function (id) {
    var task = Task.find_first(id),
        project = task.project(),
        notes = task.notes(),
        $task = findTaskElement(task);

    this.hide_current_hash("Tasks/project/" + project.id);

    if($task.find(".notes").length)
      return $task.find(".notes").toggle("slide", {direction: "up"}, 180);

    // if(!notes.length) {
    //   Note.get({key: JSON.stringify(task.id)});
    //   notes = task.notes();
    // }

    //if(!projectIsActive(project))
    //  this.project(project);

    $task.append(Otlet.view.NotesIndex.render({
      notes: Otlet.util.sortByDateAsc(notes),
      task: task,
      with_create_form: true
    }));
    
    var $notes = $task.find(".notes");
    $notes.css("opacity", 0);
    drawNotesBackground($notes);
    $notes.hide().css("opacity", 1).show("slide", {direction: "up"}, 180);
  },
  create_note: function (id) {
    var task = Task.find_first(id),
        $task = findTaskElement(task),
        $notes = $task.find(".notes"),
        body = $notes.find(".note_editor textarea").val().trim();
    
    this.hide_current_hash("Tasks/project/" + this.current_project.id);
    if(!body.length)
      return $notes.find(".note_editor textarea")[0].focus();
    
    var note = Note.storeAndCreate({
      body: body,
      task_id: task.id
    });

    $notes.find(".note_editor").before(Otlet.view.NotesIndex.render({
      notes: [note],
      task: task,
      with_create_form: false
    })).prev().css("opacity", 0).animate({opacity: 1}, 270, function () {
      this.style.opacity = 1;
    });

    $notes.find(".note_editor textarea").val("")[0].focus();
  },
  delete_note: function (id) {
    Otlet.ignore_next_url_change();
    window.location.hash = "Tasks/project/" + this.current_project.id;

    var note = Note.find_first(id);
    findNoteElement(note).hide("slide", {direction: "down"}, 180, $.removeWhenDone);
    note.del();
  },
  print: function () {
    var proj = this.current_project,
        tasks = proj.tasks(),
        out_dir = Titanium.Filesystem.getDesktopDirectory().toString(),
        output = Titanium.Filesystem.getFile(out_dir + "/" + proj.attr("title") + ".html");

    tasks = tasks.map(function (task) {
      return task.is_finished() ? undefined : task;
    }).clean();

    output.write(this.render("print", {
      project: proj,
      tasks: Otlet.util.sortByListPositionAsc(tasks)
    }));
    Titanium.Desktop.openURL("file://" + output.toString());
  },
  show_on_map: function () {
    window.location.hash = "Places/directions_for_project/" + this.current_project.id;
  },
  quickAdd: function () {
    this.hide_current_hash();
    var task = prompt("New task:");

    if(!task)
      return false;

    this.container.find(NEW_TASK_BODY_EL).val(task);
    this.formSubmit();
  },
  setActiveSidebarItem: function (el) {
    this.activeSidebarItem.removeClass("active");
    return el.parent().addClass("active");
  },
  getActiveSidebarItem: function () {
    return this.container.find("div.sidebar li.active");
  }
});

/*** Private methods ***/
/*** [imaginary]Constants ***/
var NEW_TASK_BODY_EL = "div#tasks_body.body form.update textarea",
    TASKS_EL = "div#tasks_body.body ul.task_list:first",
    NOTES_EL = TASKS_EL + "ul.task ul.notes";

/** Shortcuts **/
function C (controller) {
  return Otlet.Controller(controller || "Tasks");
}

var Project = Otlet.model.Project,
    Task    = Otlet.model.Task,
    Note    = Otlet.model.Note;

/** HTML Helpers **/
function listProjects () {
  C().render("projects_sidebar", {
    projects: Otlet.util.sortByListPositionAsc(Project.find({}))
  }, "#projects");

  // Inbox:
  $("#project_inbox")[0].outerHTML = C().render("projects_sidebar", {
    projects: Project.find_by_hashtag("inbox")
  });
  
  $("div#tasks.page div.sidebar li.project").droppable({
    accept: ".task",
    hoverClass: "drop",
    tolerance: "pointer",
    drop: taskDroppedOnProject
  });
}

function highlightElement (el, color) {
  return el.effect("highlight", {color: color||"#fbf34a"}, "slow");
}

function findProjectElement (proj) {
  proj = proj ? proj.id : C().current_project.id;
  return $("#project_" + proj + " a");
}

function findTaskElement (task) {
	return $("#task_" + task.id);
}

function findNoteElement (note) {
  return $("#note_" + note.id);
}

function classForTaskState (task) {
  var state = task;
  if(typeof(state) != "number")
    state = state.attr("state");

  if(state === Task.TASK_UNFINISHED)
    return "";
  else if(state === Task.TASK_INPROGRESS)
    return "inprogress";
  else if(state === Task.TASK_DONE)
    return "done";
}

function projectIsActive (project) {
  if(!project) return false;
  return project.id === C().current_project.id;
}

/** Callbacks **/
function newTask (e, task) {
  var proj = task.project();
  if(projectIsActive(proj)) {
    C().container.find(TASKS_EL).prepend(C().render("task", {tasks: [task]}))
  }

  updateProjectsUnfinishedTasks(proj);
  highlightElement(findTaskElement(task));

  if(proj.id === "inbox")
    updateTotalUnfinishedTasks();
}

function changeTask (e, task, changed) {
  if("state" in changed) {
    updateProjectsUnfinishedTasks(task.project());
    if(task.project().id === "inbox")
      updateTotalUnfinishedTasks();
    if(!projectIsActive(task.project()))
      return false;

    var prev_class = classForTaskState(changed.state),
        new_class  = classForTaskState(task),
        el = findTaskElement(task),
        clone = el.clone().css("visibility", "hidden"),
        done = new_class == "done",
        toY = 0,
        currY = el.offset().top;
    
    if(done) {
      var $tasks = $(TASKS_EL);
      toY = $tasks.height() + $tasks.offset().top - el.height();
      
      clone.appendTo($tasks);
    } else {
      var pos = +task.attr("list_position") || 0,
          el_after = $(TASKS_EL + " li.task:eq(" + pos + ")");
      if(!el_after.length)
        el_after = el;
      toY = el_after.offset().top;
      
      el_after.before(clone);
    }
    
    // If both, current and newly, calculated positions are close
    // (within 10px) we should skip the animation
    if((Math.max(toY, currY) - Math.min(toY, currY)) <= 10) {
      clone
        .css({visibility: "visible"})
        .removeClass(prev_class)
        .addClass(new_class);
      el.remove();
      return;
    }

    clone.removeClass(prev_class).addClass(new_class);
    
    if(done)
      el.next()
        .css({marginTop: el.height()})
        .animate({marginTop: 0}, 360);
    else
      clone.height(0).animate({height: el.height()}, 360, "linear", function () {
        clone.css("height", "auto");
      });

    el.css({
        top: el.offset().top,
        width: el.width() + "px",
        position: "absolute"
      })
      .animate({top: toY}, 120, "linear", function () {
        el.remove();
        clone.css("visibility", "visible");
      });
  }
  
  if("body" in changed) {
    var new_body = task.attr("body"),
        old_body = changed.body,
        proj = task.project();
    
    if(!old_body.contains(proj.id.wrap("[]"))) {
      var old_proj_hashtag = old_body.match(/\[(\w+)\]/),
          old_proj = Project.find_by_hashtag(old_proj_hashtag ? old_proj_hashtag[1] : "inbox")[0];

      updateProjectsUnfinishedTasks(proj);
      //highlightElement(findProjectElement(proj));
      updateProjectsUnfinishedTasks(old_proj);
      
      if(projectIsActive(old_proj) || projectIsActive(proj))
        C().project();
    }

    var old_priority = old_body.match(/\!/g),
        new_priority = task.priority();

    old_priority = Array.is(old_priority) ? old_priority.length : Task.NO_PRIORITY;
    if(old_priority !== new_priority)
      findTaskElement(task)
        .removeClass(Otlet.util.class_for_priority(old_priority))
        .addClass(Otlet.util.class_for_priority(new_priority));
  }
}

function deleteTask (e, task) {
  findTaskElement(task).remove();
  updateProjectsUnfinishedTasks(task.project());

  var notes = task.notes(), n = notes.length;
  while(n--)
    notes[n].del();
}

function taskDroppedOnProject (e, ui) {
  var project = Project.find_first(this.id.split("project_")[1]),
      task = Task.find_first(+ui.draggable[0].id.split("task_")[1]),
      $project = findProjectElement(project);

//  ui.draggable.parent().sortable("cancel");
  ui.draggable.hide();

  task.update({list_position: null});
  task.update_project(project);

  updateProjectsUnfinishedTasks(project);
  updateProjectsUnfinishedTasks(C().current_project);
}

function taskCheckboxClicked (e) {
  var task = Task.find_first(+this.parentNode.id.split("_", 2)[1]),
      state = e.shiftKey ? 1 : (this.checked ? 2 : 0);
  
  if(state == 1)
    this.checked = false;
  if(state == 1 && task.attr("state") == 1)
    state = 0;

  task.update({state: state});
}

function taskShowEditingForm (e) {
  var $this = $(this),
      task = Task.find_first(+this.parentNode.id.split("_", 2)[1]);

  $this
    .hide()
    .siblings()
      .hide()
      .end()
    .after('<textarea>' + task.attr("body") + '</textarea>')
    .parent()
      .addClass("editor")
      .find("textarea")[0].focus();
}

function hideTaskEditingForm (txta) {
  var $this = $(txta);
  $this
    .hide()
    .parent()
      .removeClass("editor")
      .children()
        .show();

  return !!$this.remove();
}

function taskEditingFormCallback (e) {
  var $this = $(this),
      task = Task.find_first(+this.parentNode.id.split("_", 2)[1]);
  
  if(e.keyCode !== Event.KEY_RETURN)
    if(e.keyCode === Event.KEY_ESC)
      hideTaskEditingForm(this);
    else return true;

  Event.kill(e);

  task.update("body", $this.val());

  var p_body = $this.siblings("p.task_body").html(
    Otlet.View.template_helpers.body_formatter(task.attr("body"))
  );

  hideTaskEditingForm(this);
  highlightElement(p_body.parent());
  return false;
}

function hideCreateProjectTextField (el) {
  return !$(el).parent().parent().fadeOut(180, $.removeWhenDone);
}

function createProjectTextFieldCallback (e) {
  if(e.keyCode !== Event.KEY_RETURN)
    return true;
  if(!this.value.length || e.keyCode == Event.KEY_ESC)
    return !hideCreateProjectTextField(this);

  Event.kill(e);

  var $this = $(this),
      title = $this.val().trim();

  Project.storeAndCreate({
    title: title,
    hashtag: title.titilize()
  });

  hideCreateProjectTextField($this);
}

function newProject (e, project) {
  listProjects();
  window.location.hash = "Tasks/project/" + project.id;
}

function deleteProject(e, project) {
  findProjectElement(project).remove();
  
  if(projectIsActive(project))
    C().index();
}

function updateProjectsUnfinishedTasks (project, n) {
  var el = findProjectElement(project),
      span = el.find("span.new");

  if(arguments.length === 1)
    n = project.unfinished_tasks().length;
  if(n === 0)
    return span.fadeOut(120, function () { span.remove(); }) && true;
  if(n > 1000)
    n = Math.floor(n/1000) + "k+";

  if(span.length)
    span.text(n);
  else
    el.prepend('<span class="new" style="display:none">' + n + '</span>')
      .find("span.new")
      .fadeIn(120);

  return true;
}

function updateTotalUnfinishedTasks () {
  var l = Project.find_first("inbox").unfinished_tasks().length;
  //Titanium.UI.setBadge(l ? String(l) : "");
}

function drawNotesBackground ($el) {
  var w = 6,
      h = $el.height(),  
      canvas = $('<canvas width="' + w + '" height="' + h + '"></canvas>')[0],
      ctx = canvas.getContext("2d");

  // Background gradient
  var bg = ctx.createLinearGradient(0, 0, 1, h);
  bg.addColorStop(0, "rgba(254, 248, 188, 1.0)");
  bg.addColorStop(1, "rgba(252, 241, 132, 1.0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Dotted line on the top
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, 1.5);
  ctx.fillStyle = "#efc76c";
  ctx.fillRect(0, 0, 1, 3);
  ctx.fillRect(3, 0, 1, 3);

  $el.css("background", "#fcf286 url('" + canvas.toDataURL() + "') 0 0 repeat-x");
    
  // Zig-zag pattern at the bottom
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#efc76c";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w/2 + Math.random()*1.353, h - 4.513 - Math.random()*1.63);
  ctx.lineTo(w + Math.random()*2.23, h);
  ctx.stroke();
  ctx.fill();
}
