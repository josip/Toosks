(function () {
  var FS = Titanium.Filesystem,
      dir = FS.getResourcesDirectory().resolve("Resources/views"),
      view_dirs = dir.getDirectoryListing(),
      n = view_dirs.length;
  
  while(n--) {
    var dir = view_dirs[n],
        controller_name = dir.name().camelize();
    if(dir.isFile())
      continue;

    var views = dir.getDirectoryListing(),
        m = views.length;

    while(m--) {
      var view = views[m];
      if(!view.isFile())
        continue;
      
      var view_fs = FS.getFileStream(view),
          view_name = controller_name + view.name().split(".", 2)[0].camelize();
      
      view_fs.open(FS.FILESTREAM_MODE_READ);
      Otlet.View(view_name).klass.template = view_fs.read().toString();
      view_fs.close();
    }
  }
})()