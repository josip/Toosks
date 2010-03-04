(function () {
var util = Otlet.util,
    Note = Otlet.model.Note;

function C () {
  return Otlet.Controller("Notes");
}

Otlet.Controller("Notes", {
  index: function () {},
  ready: function () {},
  show: function (notes) {
  },
  show_for_task: function (task_id) {
    var task = Otlet.model.Task.find_first(task_id),
        notes = task.notes(),
        project = task.project();
    
    if(!notes.length) {
      Note.get({key: task.id});
      notes = task.notes();
    }
    
    if(!util.projectIsActive(project)) {
      Otlet.Controller("Tasks").project(project);
    }
    
    this.show(notes);
  }
});
})()