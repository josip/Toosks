var _priorities = ["normal", "low", "medium", "high"];
Otlet.util.class_for_priority = function (priority) {
  return "priority_" + _priorities[priority];
};