(function () {
  var dirs = "languages util models views/loader.js controllers router.js".split(" ").reverse(),
      d = dirs.length,
      FS = Titanium.Filesystem;

  while(d--) {
    var dir_name = dirs[d],
        dir = FS.getResourcesDirectory().resolve("Resources/" + dir_name),
        resources = dir.getDirectoryListing();

    if(!dir.exists())
      throw new Error("Missing or wrong resource definition " + dir_name);

    if(dir.isFile()) {
      exec_file(dir);
      continue;
    }

    var n = resources.length;
    while(n--)
      exec_file(resources[n]);
  }

  var App = Otlet.Controller("Application");
  function exec_file(file, dest, prop) {
    if(file.name().charAt(0) === "_")
      return false;

    var fs = FS.getFileStream(file);
    fs.open(FS.FILESTREAM_MODE_READ);
    var f = fs.read().toString();
    fs.close();

    if(dest)
      dest[prop] = f;
    else {
      console.log("Executing file " + file.name());
      (new Function("App", f))(App);
    }
  }
})()