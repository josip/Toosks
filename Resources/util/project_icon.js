var w = 16,
    h = 16,
    canvas = $('<canvas width="' + w + '" height="' + h + '"/>')[0],
    ctx = canvas.getContext("2d");

ctx.strokeStyle = "rgba(255,255,255,0.8)";
ctx.lineWidth = 1;
var reflection = ctx.createLinearGradient(0, h/2 - 3, 0, h/2 + 3);
reflection.addColorStop(0, "rgba(255,255,255,0.8)");
reflection.addColorStop(1, "rgba(255,255,255,0)");

Otlet.View.template_helpers.icon_for_project = function (project) {
  ctx.clearRect(0, 0, w, h);

  if(!project.attr("colour"))
    project.update("colour", "rgb" + [
      Math.round(Math.random(255)),
      Math.round(Math.random(255)),
      Math.round(Math.random(255))
    ].join(",").wrap("()"));

  ctx.beginPath();
  ctx.arc(w/2, h/2, (w-4)/2, 0, 2*Math.PI, false);
  ctx.fillStyle = project.attr("colour");
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w/2, h/2 - 1, 4, 0, 2*Math.PI, false);
  ctx.fillStyle = reflection;
  ctx.fill();

  return canvas.toDataURL();
}
