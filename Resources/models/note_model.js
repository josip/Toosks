Otlet.Model("Note", {
  $config: {
    key: "id",
    belongs_to: "Task", 
  },
  $attributes:  ["id", "task_id", "body", "created_at", "updated_at"],
  $trashable:   true
});
Otlet.model.Note.SQLiteStore = new Otlet.SQLiteStore("Note", "id", {
  id:         "REAL PRIMARY KEY",
  task_id:    Number,
  body:       String,
  created_at: Date,
  updated_at: Date
});
Otlet.model.Note.SQLiteStore.should_listen_to_model_events = true;