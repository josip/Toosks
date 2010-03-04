(function () {

Otlet.util.PNGAnim = function (el, height, frames) {
  this.el             = $(el)[0];
  this.img_height     = height;
  this.frames         = frames;
  this.frame_height   = height/frames;
  this.frame          = -1;
  this.delay          = 60;
  this.animated_prop  = "backgroundPositionY";
  this.return_to_top  = false;
  this.whenDone       = null;
  this.is_playing     = false;
  this._anim_interval = null;
  
  return this;
}

function PNGAnim_animate () {
  var prop = this.animated_prop;

  if(this.frame + 1 >= this.frames) {
    clearInterval(this._anim_interval);
    
    if(Function.is(this.whenDone))
      this.whenDone(this);

    this.frame = -1;
    this.is_playing = false;
    if(this.return_to_top)
      this.el.style[prop] = "0px";
      
    return false;
  }

  this.el.style[prop] = -(this.frame_height * ++this.frame) + "px";
};

Otlet.util.PNGAnim.prototype = {
  play: function (direction) {
    if(this.is_playing)
      return this;
    
    this.is_playing = true;
    this._play_dir = direction;
    this._anim_interval = setInterval(PNGAnim_animate.bind(this), this.delay);
    
    return this;
  },
  stop: function () {
    clearInterval(this._anim_interval);
    this.el.style[this.animated_prop] = "0px";
    
    return this;
  }
}

/*** Poof animation ***/
var _poof_el, _poof_anim;
$(function () {
  _poof_el = document.getElementById("poof");
  
  _poof_anim = new Otlet.util.PNGAnim(_poof_el, 640, 5);
  _poof_anim.whenDone = function () {
    _poof_el.style.display = "none";
  };
});

Otlet.util.poof = function (el, action, cb) {
  el = $(el);
  var pos = $(el).offset();
  if(action)
    $(el)[action](); // example: "hide" or "remove"
  
  _poof_el.style.top = (pos.top - _poof_anim.frame_height/2) + "px";
  _poof_el.style.left = (pos.left - _poof_anim.frame_height/2) + "px";
  _poof_el.style.display = "block";

  _poof_anim.play();
}
})()