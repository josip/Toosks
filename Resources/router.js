with(Otlet.router) {
  match(".")
    .to("Tasks", "inbox")
    .as("root");

  match("#Tasks/inbox")
    .to("Tasks", "inbox")
    .as("inbox");

  match("#Tasks/createProject")
    .to("Tasks", "createProject");

  match("#Tasks/:action/:id")
    .to("Tasks", ":action");

  match("#Contacts/c/:id")
    .to("Contacts", "show");

  match("#Contacts/me")
    .to("Contacts", "me");

  match("#mailto/:addr").to(function (addr) {
    Titanium.Desktop.openURL("mailto:" + addr);
  }).as("mailto");
  
  match("#in_browser/:addr").to(function (addr) {
    Titanium.Desktop.openURL(addr);
  }).as("openurl");

  default_routes(true);
}