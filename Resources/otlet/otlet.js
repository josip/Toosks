/** package Otlet
  * provides Otlet.Base, Otlet.Radio, Otlet.Private
  */

/** singleton Otlet */
window.Otlet = {};
window.Otlet = {
  util: {},
  lib: {}
};

/** function Otlet.prepareClass(name, methods) -> Object
  *   - name<String>: Name four your class
  *   - methods<Object>: Class objects view [#methods_format]
  * description: Function which add some nice features to JS.Class method
  *
  *#methods_format
  *#<ul>
  *#  <li></li>
  *#</ul>
  *
  */
Otlet.prepareClass = function (name, methods) {
  if(!name)
    name = "Untitled";

  if(!methods || methods === {})
    return {extend: {_name: name}};

  var env = {
    methods:    methods,
    class_m:    {_name: name},
    private_m:  {},
    extend:     methods.extend || [],
    include:    methods.include || [],
    getters:    {},
    setters:    {},
    filters:    $.H(Otlet.class_filters).asArray(),
    original_init: methods.initialize
  };

  delete env.methods.extend;
  delete env.methods.include;
  delete env.methods.initialize;

  var filter_names = $.H(Otlet.class_filters).asArray(), m;

  for(var n in env.methods) {
    m = filter_names.length;
    while(m--)
      if(n.indexOf(filter_names[m]) === 0 && n.length > 3)
        if(Otlet.class_filters[filter_names[m]].apply(env, [n]) !== false)
          delete env.methods[n];
  }

  if(env.getters === {})
    env.getters = false;
  if(env.setters === {})
    env.setters = false;

  JS.extend(env.methods, {
    extend: [env.class_m].concat(env.extend),
    include: [].concat(env.include),
    iid: Math.random().toString(16), /* lol */
    initialize: function () {
      if(env.getters)
        for(var n in env.getters)
          this.__defineGetter__(n, env.getters[n]);
      if(env.setters)
        for(var n in env.setters)
          this.__defineSetter__(n, env.setters[n]);

      if(this.turnRadioOn) {
        this.turnRadioOn();
        delete this.turnRadioOn;
      }

      if(Function.is(this.callSuper))
        try { this.callSuper(); } catch(e) { delete e; }

      if(env.original_init)
        return env.original_init.apply(this, arguments);

      return this;
    }
  });

  return methods;
};

/** property Otlet.class_filters<Object>: Methods defined here
  * are used in [Otlet.prepareClass] to provide shortcuts, you are free to add more
  */
Otlet.class_filters = {
  /** function Otlet.class_filters.$(n) -> undefined
    *   - n<String>: Original name of the property
    * description: All methods whose name starts with "$" become class methods
    *
    *##prepareClass_$_filter
    *#<pre>
    *#  var Test = new JS.Class(Otlet.prepareClass("Test", {
    *#    $type: "Test",
    *#    initialize: function () { console.log(this.klass.type, this.type) }
    *#  }));
    *#  new Test(); //=> "Test, undefined" in console
    *#</pre>
    */
  $: function (n) {
    this.class_m[n.slice(1)] = this.methods[n];
  },
  /** function Otlet.class_filters.get(n) -> false | undefined
    *   - n<String>: Original name of the property
    * description: Methods whose name starts with "get" become getter functions
    *              of instance [#prepareClass_get_filter]
    *
    *##prepareclass_get_filter
    *#<pre>
    *#  var c = {
    *#    getUserName: function () {
    *#      return this._name || "John Doe";
    *#    },
    *#    setUserName: function (name) {
    *#      document.title = "Profile for: " + name;
    *#      return this._name = name;
    *#    }
    *#  };
    *#  var Test = new JS.Class(Otlet.prepareClass("Test", c));
    *#  var mia = new Test();
    *#  console.log(mia.userName); //=> "John Doe";
    *#  console.log(mia.userName = "Mia") //=> "Mia" + window title change
    *#</pre>
    */
  get: function (n) {
    if(!Function.is(this.methods[n]))
      return false;
    if(this.methods[n].length !== 0)
      return false;

    var fn = this.methods[n];
    this.getters[n.charAt(3).toLowerCase() + n.slice(4)] = fn;
  },
  /** function Otlet.class_filters.set(n) -> false | undefined
    *   - n<String>: Original name of the property
    * description: Methods whose name begins with "set" become
    *              setter functions of instance [#prepareClass_get_filter]
    */
  set: function (n) {
    if(!Function.is(this.methods[n]))
      return false;
    if(this.methods[n].length !== 1)
      return false;

    var fn = this.methods[n];
    this.setters[n.charAt(3).toLowerCase() + n.slice(4)] = fn;
  }
};

/** module Otlet.Base
  * include: Otlet.Radio
  */
Otlet.Base = new JS.Module({
  include: Otlet.Radio,
  /** function Otlet.Base.methodFor$(name) -> Function
    *  - name<String>: Name of an instance method
    * description: Converts an instance method suitable for jQuery callback,
    *              +this+ stays bind with class, while first argument
    *              is element node (+this+ in jQuery callbacks)
    *
    *#methodFor$_example
    *#<pre>
    *#  Otlet.Controller("Test", {
    *#    mmain: function
    *#  });
    *#</pre>
    */
  methodFor$: function (name) {
    var fn = this.method(name), that = this;

    return function () {
      return fn.apply(that, [this].concat(Array.from(arguments)));
    };
  }
});

/** property Otlet.util<Object> */
Otlet.util = {
  /** function Otlet.util.summarizeAttribute(singular, methods) -> Object
    *   - singular<String>: Singular attribute name
    *   - methods<Object>: Object with methods which need to get summarized
    *
    * description: Summarize attributes into one
    *
    *##summarizeAttribute_example
    *#<pre>
    *#  var obj = {color: "red"}, obj1 = {colors: ["red", "green"]};
    *#  Otlet.util.summarizeAttribute("colors", obj); //=> {colors: ["red"]}
    *#</pre>
    */
  summarizeAttribute: function (singular, methods) {
    var plural = singular.pluralize();

    methods[plural] = [].concat(methods[plural]||[]).concat(methods[singular]||[]);

    delete methods[singular];
    return methods;
  }
};

/** module Otlet.Radio
  * description: Otlet's implementation of Observer pattern
  */
Otlet.Radio = new JS.Module({
  /** function Otlet.Radio.turnRadioOn -> true
    * description: When including Otlet.Radio it is important to call this method
    *              for Otlet.Radio to function normally
    */
  turnRadioOn: function () {
    this._listeners = this._listeners || {"#all": [], "#default": []};
    this.turnRadioOn = undefined;
    return true;
  },
  /** function Otlet.Radio.listen(ch = "#default", fn[, scope = null]) -> true | false
    *   - ch<String>: Channel to listen, not that listener subscribed to channel example:123
                      will be notified when you emit signal on channel "example" with first argument "123"
    *   - fn<Function>: Function to call when something happens on channel
    *   - scope<Object>: Scope in which function should get called
    *
    * description: Listen to an channel for events
    */
  listen: function (ch, fn, scope) {
//     console.log("Listen", arguments);
    ch = ch || "#default";
    var msg_id;

    if(ch.split(":").length) {
      var _ch = ch.split(":", 2);
      ch = _ch[0];
      msg_id = _ch[1];
      delete _ch;
    }

    if(!(ch in this._listeners))
      this._listeners[ch] = [];
    if(!Function.is(fn))
      return false;

    if(msg_id)
      fn = (function (e) {
        return e == msg_id ? arguments : false;
      }).before(fn);

    var listener = {fn: fn, scope: scope||null};

    if(this._listeners[ch].contains(listener))
      return false;
    else
      return !!this._listeners[ch].push(listener);
  },
  /** function Otlet.Radio.stopListening(ch, fn[, scope = null]) -> true | false
    *   - ch<String>: Channel's name to stop listening
    *   - fn<Function>: Function to remove
    *   - scope<Object>: Same scope which was provided when calling listen()
    *
    * description: Stop listening to an channel, use the same arguments
    *              you used when subscribing to channel
    */
  stopListening: function (ch, fn, scope) {
    if(!(ch in this._listeners))
      return false;

    var chan = this._listeners[ch],
        n = chan.length, listener, found = false;
    scope = scope || null;
    while(n--) {
      listener = chan[n];
      if(listener.fn.toString() == fn.toString() && listener.scope == scope) {
        found = true;
        break;
      }
    }

    return found ? !!(this._listeners[ch] = chan.cutAt(n)) : false;
  },
  /** function Otlet.Radio.boring(ch, fn[, scope = null]) -> true | false
    * deprecated
    * alias of: Otlet.Radio.stopListening
    */
  boring: function (ch, fn, scope) {
    console.error("Using deprecated Otlet.Radio#boring", arguments.callee.caller.toString());
    return this.stopListening(ch, fn, scope);
  },
  /** function Otlet.Radio.emit(ch[, ...]) -> undefined
    *   - ch<String>: Channel name
    *   - ...: Other data which will be passed to listeners
    *
    * description: Emit an event on channel
    */
  emit: function (ch) {
    ch = ch || "#default";
    var ch_parts = ch.split(".", 2),
        chs = ["#all"].concat(ch_parts[0])  ;
    
    var n = chs.length, m, channel;
    while(n--) {
      channel = this._listeners[chs[n]];
      m = channel ? channel.length : 0;

      while(m--)
        channel[m].fn.apply(channel[m].scope, arguments);
    }
  }
});

(function () {
  var P = new JS.Class({
    _instances: {},

    addInstance: function (id) {
      if(!id || this._instances[id])
        return false;

      this._instances[id] = {};
      return true;
    },
    get: function (id) {
      if(!id) return false;
      if(!this._instances[id]) return false;

      return this._instances[id];
    },
    hasInstance: function (id) {
      return id && this._instances[id] ? true : false;
    },
    removeInstance: function (id) {
      if(!id) return false;
      if(!this._instances[id]) return false;

      delete this._instances[id];
      return true;
    }
  });

  /** function Otlet.Protected(id) -> Object
    *   - id<Object|String>: An object with iid property or unique ID
    * description: Implementation of private variables for JS, use with closures
    *
    *##protected_example
    *#<pre>
    *# var CreditCard;
    *#(function () {
    *#  var __ = Otlet.Protected();
    *#  CreditCard = new JS.Class({
    *#    initialize: function (code) {
    *#      this.iid = Math.random();
    *#       __(this).type = "visa";
    *#       __(this).code = code.toString();
    *#    },
    *#    printCode: function () {
    *#      return __(this).code ? __(this).code.split("-", 2)[0] + "..." : false
    *#    },
    *#    onProccessingDone: function () {
    *#      __.removeInstance(this);
    *#    }
    *#  });
    *#})()
    *#var user1 = new CreditCard("2384-1235-2134-1236");
    *#alert(user1.printCode());
    *#</pre>
    */
  Otlet.Protected = function () {
    var p = new P();

    var wrapper = function (id) {
      if(id && id.iid)
        id = id.iid;
      if(!id)
        return false;

      if(!p.hasInstance(id))
        p.addInstance(id);

      return p.get(id);
    };
    /** function Otlet.Protected.removeInstance(id) -> true | false
      *   - id<Object|String>: ID of an group of private methods
      */
    wrapper.removeInstance = function (id) {
      return p.removeInstance(id);
    };

    return wrapper;
  };
})();

