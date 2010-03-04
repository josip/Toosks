
JS.extend(Function, {
  unfreeze: function (ns, name) {
    if(arguments.length === 1 && ns.constructor === String) {
      name = ns;
      ns = this; 
    }

    return !ns[name]._frozen ? ns[name] : ns[name] = method._frozen;
  },
  before: function (ns, name, fn) {
    return ns[name] = fn.before(ns[name]);
  },
  after: function (ns, name, fn) {
    return ns[name] = fn.after(ns[name]);
  }
});

/**
 * Functional extensions (curry, partial and runs):
 * Copyright (c) 2005-2008 Sam Stephenson / the Prototype team,
 * released under an MIT-style license.
 */
JS.extend(Function.prototype, {
  argumentNames: function () {
    var matches = this.toString().match(/\(([^\)]+)\)/);
    return matches ? matches[1].split(", ") : [];
  },
  _mask: function(self) {
    // Copied from JS.Class
    self = self || this;
    var string = self.toString().replace(/callSuper/g, 'super');
    self.toString = function () { return string };
    return self;
  },
  partial: function() {
    if (!arguments.length) return this;
    var method = this, args = Array.from(arguments);
    return function() {
      return method.apply(this, args.concat(Array.from(arguments)));
    }.freeze(this);
  },
  curry: function(n) {
    var method = this, n = n || this.length;
    return function() {
      if (arguments.length >= n) return method.apply(this, arguments);
      return method.partial.apply(arguments.callee, arguments);
    }.freeze(this);
  },
  runs: function(times) {
    var method = this, count = 0;
    return function() {
      return times == -1 || (count++ < times) ? method.apply(this, arguments) : undefined;
    }.freeze(this);
  },
  bind: function (scope) {
    var _fn = this,
        args = Array.from(arguments).slice(1);

    return function () {
      return _fn.apply(scope, args.concat(Array.from(arguments)));
    }.freeze(_fn);
  },
  freeze: function (state) {
    this._frozen = state;
    this.name = state.name;
    this.toString = function () { return state.toString() };

    return this;
  },
  original: function () {
    var fn = this;
  
    while(Function.is(fn._frozen))
      fn = fn._frozen;

    return fn;
  },
  wrap: function (wrapper) {
    var fn = this;

    return function () {
      return wrapper.apply(this, [fn.bind(this)].concat(Array.from(arguments)));
    }.freeze(fn);
  },
  /* +this+ has to return array or +new Error("halt")+, if it returns array
   * wrapped function will be called with returned array, but if
   * +this+ returns +new Error("halt")+ wrapped function won't be called and
   * it will exit with +false+
   *
   */
  before: function (fn) {
    var that = this;

    return fn.wrap(function (original) {
      var args = Array.from(arguments),
          new_args = that.apply(this, args) || [];

      if(new_args.constructor === Object && !new_args.prototype && !new_args[0])
        /* +new_args+ are actually just +that+'s +arguments+ */
        new_args = Array.from(new_args);

      return new_args.message === "halt" ? false : original.apply(this, [].concat(new_args));
    });
  },
  /* +this+ as first argument receives what wrapped function returned,
   * value +this+ returns will be used as final returned value.
   * Note that wrapped function and +this+ won't necessary receive same arguments,
   * since wrapped function can be result of .before()
   */
  after: function (fn) {
    var that = this;
    
    return fn.wrap(function (original) {
      var args = Array.from(arguments).slice(1),
          res = original.apply(this, args);

      return that.apply(this, [res].concat(args));
    });
  },
  /* When +_fn+ is called before +fn+ first argument (to +fn+) will be +Infinity+, and
   * value returned from +_fn+ will have no effect, but when +fn+ gets called after +_fn+,
   * returned value will be used as final return value, also in that case, first argument
   * is value returned from +fn+ (which could just pass returned value of +_fn+)
   */
  around: function (fn) {
    var _fn = this, observed;

    observed = (function () {
      var args = Array.from(arguments);
      _fn.apply(this, [Infinity].concat(args));
      return args;
    }).before(fn);
    observed = (function (res) {
      _fn.apply(this, arguments);
      return res;
    }).after(observed);

    return observed;
  },
  overload: function (types, _fn) {
    if(types.length !== _fn.length) return this;
    
    return this.wrap(function (original) {
      var args = Array.from(arguments).slice(1),
          m = args.length;
          
      if(_fn.length !== m)
        return original.apply(this, args);
      else
        for(var n = 0; n < m; n++)
          if(args[n].constructor !== types[n])
            return original.apply(this, args);

      return _fn.apply(this, args);
    });
  }
});

JS.extend(Event, {
  kill: function (e) {
    if(e.stopPropagation) e.stopPropagation();
    if(e.preventDefault)  e.preventDefault();

    return false;
  },
  KEY_BACKSPACE:  8,
  KEY_TAB:        9,
  KEY_RETURN:     13,
  KEY_ESC:        27
});

JS.extend(Number, {
  is: function (n) {
    return n !== null && n !== undefined && !isNaN(n) && isFinite(n);
  }
});

JS.extend(Number.prototype, {
  times: function (fn) {
    var n = parseInt(this, 10), m = parseInt(this, 10), errors = [];

    while(n--)
      try { fn(m - n) === false ? n = 0 : true } catch(e) { errors.push(e) }

    return errors.length ? errors : true
  }
});

JS.extend(Date.prototype, {
  format: function (format) {
    var d = this;
    return _(format, {
      m: d.getMinutes(),
      h: d.getHours(),
      s: d.getSeconds(),
      d: d.getDate(),
      D: Date.dayToString(d.getDay()),
      M: d.getMonth() + 1,
      w: Date.monthToString(d.getMonth()),
      y: d.getFullYear(),
      t: d.getTime()
    });
  },
  atMidnight: function () {
    this.setHours(0);
    this.setMinutes(0);
    this.setSeconds(0);
    this.setMilliseconds(0);
    return this;
  }
});

JS.extend(Date, {
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  /** Convert JS day number to human readable form
   * @params {Number} day ex. (new Date()).getDay()
   * @returns {String} Name of day (in English);
   */
  dayToString: function (day) {
    return Date.days[parseInt(day, 10)%7];
  },
  /** Convert JS month to plain English
   * @params {Number} month ex. (new Date()).geMonth()
   * @returns {String} Month in English
   */
  monthToString: function (month) {
    return Date.months[parseInt(month, 10)%12];
  },
  today: function () {
    return (new Date()).atMidnight();
  },
  tomorrow: function () {
    var d = this.today();
    d.setDate(d.getDate() + 1);
    return d;
  },
  yesterday: function () {
    var d = this.today();
    d.setDate(d.getDate() - 1);
    return d;
  }
});

JS.extend(Array, {
  from: function (obj) {
    return JS.array(obj);
  },
  is: function (obj) {
    // Source: http://bit.ly/KlIB
    return Object.prototype.toString.call(obj) === '[object Array]';
  }
});

JS.extend(Array.prototype, {
  last: function () {
    return this[this.length - 1];
  },
  contains: function (el) {
    return !!~this.indexOf(el)
  },
  random: function (just_index) {
    var rand = Math.floor(Math.random() * this.length);
    return just_index ? rand : this[rand]
  },
  max: function (index_please) {
    if(index_please !== true) return Math.max.apply(null, this);

    var max = 0, n = this.length;
    while(n--) if(this[n] > this[max]) max = n;

    return max;
  },
  min: function (index_please) {
    if(index_please !== true) return Math.min.apply(null, this);

    var min = 0, n = this.length;
    while(n--) if(this[n] < this[min]) min = n;

    return min;
  },
  isEmpty: function () {
    return this.length === 0;
  },
  cut: function (val) {
    return this.cutAt(this.indexOf(val));
  },
  cutAt: function (n) {
    if(n >= 0)
      return this.slice(0, n).concat(this.slice(++n, this.length));
    else
      return this;
  },
  insert: function (val) {
    return this.contains(val) ? -1 : this.push(val);
  },
  toURL: function (path, ext) {
    return ((path || "") + this.join("/") + (ext || "")).replace(/(\/)+/, "/");
  },
  clean: function () {
    var cleaned = this, n = cleaned.length;
    while(n--)
      if(cleaned[n] === undefined)
        cleaned = cleaned.cutAt(n);
    
    return cleaned;
  },
  flatten: function () {
    var flat = [],
        n = 0,
        m = this.length,
        item;

    for(; n < m; n++) {
      item = this[n];
      if(Array.is(item))
        flat = flat.concat(item.flatten());
      else
        flat.push(item);
    }

    return flat;
  },
  uniq: function () {
    var m = this.length,
        n = 0,
        r = [];

    for(; n < m; n++)
      if(!r.contains(this[n]))
        r.push(this[n]);

    return r;
  }
});

JS.extend(String, {
  vowels: "aeio".split(""),
  sibilants: "hos".split(""),
  is: function (obj) {
    return typeof(obj) === "string"
  }
});
/*
String._split = String.prototype.split;
String.prototype.split = (function (s, n) {
  if(!Number.is(n))
    return [Function.CONTINUE_STACK, arguments];

  n -= 1;
  var splited = String._split.call(this, s);
  return splited.slice(0, n).concat(splited.slice(n).join(s));
}).before(String.prototype.split);
*/

JS.extend(String.prototype, {
  contains: function (str) {
    return !!~this.indexOf(str);
  },
  map: function(expr, map) {
    var s = this.match(expr).slice(1),
        r = {};

    for(var n = 0, m = map.length; n < m; n++)
      r[map[n]] = s[n];

    return r;
  },
  wrap: function (s, e) {
    if(!e) {
      e = s.charAt(1);
      s = s.charAt(0);
    }
    return s + this + e;
  },
  firstToUpperCase: function () {
    return this.slice(0, 1).toUpperCase() + this.slice(1);
  },
  pluralize: function () {
    var last = this.slice(-1).toLowerCase(),
        last_m2 = this.charAt(this.length - 2).toLowerCase();

    if(!!~String.sibilants.indexOf(last))
      return this + 'es';
    if(last === 'y' && String.vowels.indexOf(last_m2) === -1)
      return this.slice(0, -1) + 'ies';

    return this + 's';
  },
  singularize: function () {
    var last    = this.slice(-1).toLowerCase(),
        last3   = this.slice(-3).toLowerCase(),
        last_m3 = this.charAt(this.length - 3).toLowerCase(),
        last2   = this.slice(-2).toLowerCase();

    if(!!~String.sibilants.indexOf(last_m3) && last2 === 'es')
      return this.slice(0, -2);
    if(last3 === 'ies' && String.vowels.indexOf(this.slice(-4).toLowerCase()))
      return this.slice(0, -3) + 'y';
    if(last == 's')
      return this.slice(0, -1);

    return this.toString();
  },
  camelize: function () {
    var string;
    if(this.contains(" "))
      string = this.split(" ");
    else if(this.contains("_"))
      string = this.split("_")
    else
      string = [this];

    var n = string.length;
    while(n--)
      string[n] = string[n].charAt(0).toUpperCase() + string[n].slice(1);

    return string.join('');
  },
  pascalize: function () {
    var cc = this.camelize();
    return cc.charAt(0).toLowerCase() + cc.slice(1);
  },
  unCamelize: function () {
    var string_up = this.toUpperCase().split(''),
        last_break = undefined,
        string_s = this.split('');

    for(var n = 0, m = this.length; n < m; n++)
      if(string_up[n] === string_s[n] && last_break !== n-1) {
        last_break = n;
        string_s[n-1] += '_';
      }

    return string_s.join('');
  },
  titilize: function () {
    return this.toLowerCase().replace(/(\W+)/g, "-").replace(/-{2,}/g, "").trim()
  },
  trim: function () {
    return $.trim(this);
  }
});
// })()

//(function () {
  function Hash (obj) {
    if(obj instanceof Hash) obj = obj.hash;

    this.hash = {};

    for(var prop in obj)
      this.hash[prop] = obj[prop];

    return this;
  };

  JS.extend(Hash.prototype, {
    /** Run an function against every hash property (excluding Hash.prototype methods)
      * @params {Function} fn Function to run, function will be called with arguments [key, value, hash]
      * @params {Object} [scope] Scope to run function in, defaults to null (this === window inside fn)
      * @returns {Hash} Current hash;
      * @example
      * var a = new Hash({show: 'f2-2a-54', col: '12', row: '4'}); b = [];
      * a.each(function (k,v,h) { b.push(k) });
      * console.log(b); // => ['show', 'col', 'row']
      */
    each: function (fn, scope) {
      var _this = this.hash;

      for(var prop in _this)
        fn.bind(scope||null, prop, _this[prop], this)();

      return this;
    },
    /** Similar as Hash.each but:
      * (1) It won't fail if one of functions throws an exception, all exceptions are returned in array.
      * (2) It will fail when first function returns +false+
      * @returns {Array|Boolean} If function (+fn+) returns +false+ then catchEach will also,
      *  if an exeception was thrown it will return array with all execptions,
      *  if no execeptions happened and function haven't returned +false+ in any case then catchEach returns +true+
      * @example
      * var a = new Hash({a:1, b:2, c: 3, d:4}), n = 0;
      * a.catchEach(function (k, v, h) { n++; if(n === 3) return false })
      * n // => 3
      */
    catchEach: function (fn, scope) {
      var _this = this.hash, errors = [];

      for(var prop in _this)
        try {
          if(fn.apply(scope, [prop, _this[prop], this]) === false)
            return false;
        } catch (e) {
          errors.push(e);
        }

      return errors.length ? errors : true;
    },
    /** Maps hash values
      * @parmas {Function} fn Function which has to return new value for property
      * @params {Boolean} [direct] To act on current hash (+true+), or return new (+false+, default)
      * @returns {Hash} if +direct+ is +true+ returns current hash, otherwise new one
      * @example
      * var a = new Hash({name: 'Josip', from: 'HR'});
      * a.map(function(key, value, hash) { if(key == 'name') return 'Joshep'; if(key == 'from') return 'GB' }, true);
      * a.strip() // => {name: 'Joshep', from: 'GB'}
      */
    map: function (fn, direct) {
      var r = direct === true ? this : new this.constructor();

      this.each(function (k, v, h) {
        r.set(k, fn(k, v, h));
      });

      return r;
    },
    /** Sets hash property (and creates if not defined)
      * @params {String} k Propety name
      * @params {Anything} v Propety value
      * @returns {Hash} Current hash
      */
    set: function (k, v) {
      this.hash[k] = v;
      return this;
    },
    /** Chaining method
      * @params {Boolean} statement An statement which eventually evals to truthy or falsy value
      * @returns {Hash} If statement is truthy it returns current hash, otherwise new empty Hash
      */
    when: function (statement) {
      return statement ? this : new this.constructor();
    },
    /** Test how much properties two objects share
      * @params {Object} obj First object
      * @params {Object} reqs Second object
      * @returns {Number} Number of matches (0 means none)
      * @example
      * Object.matches({green: 'much', brown: 'not-so-much'}, {green: 'much', brown: 'alot'}) => 1
      * Object.matches({green: 'much', orange: 'not-so-much'}, {white: 'much', black: 'enough'}) => 0
      */
    matches: function (reqs) {
      var hits = 0, _this = this.hash, reqs = new this.constructor(reqs);

      reqs.each(function (k, v) {
        if(k in _this && _this[k] === v) hits++;
      });

      return hits;
    },
    /** Doese an object contains properties of other
    * @params {Object} obj Object you'r testing
    * @params {Object} compare Object which will be tested against obj
    * @example
    * Object.contains({moo: true, milk: 12}, {moo: true, milk: 12, grass: false}) => true
    * Object.contains({moo: true, milk: 11}, {moo: true, milk: 12, grass: false}) => false
    * Object.contains({moo: false}, {}) => false
    */
    contains: function(compare_to) {
      var _this = this.hash;
      compare_to = new this.constructor(compare_to);

      if(_this === compare_to.hash)
        return true;

      var r = compare_to.catchEach(function (k, v, h) {
        if(!(k in _this) || _this[k] !== v)
          return false;
      });

      return !(r.constructor === Array || r === false);
    },
    /** Create an array of keys or values
      * @params {Boolean} [o] Push keys (any value) or push values (+true+) to resulting array
      * @parmas {Number} [n] Number of elements in array
      * @returns {Array}
      * @example
      * Object.toArray({milk: 'yes please', cigare: 'NO thanks!'}) => ['milk', 'cigare']
      * Object.toArray({milk: 'yes please', cigare: 'NO thanks!'}, true) => ['yes please', 'NO thanks!']
      * Object.toArray({milk: 'yes please', cigare: 'NO thanks!'}, 1) => ['milk']
      * Object.toArray({milk: 'yes please', cigare: 'NO thanks!'}, true, 1) => ['yes please']
      */
    asArray: function (o, n) {
      if(typeof o === 'number') {
        var m = n;
        n = o;
        o = m;
        delete m;
      }

      var r = [];

      this.each((function (k, v, h) {
        r.push(o === true ? v : k)
      }).runs(n || -1));

      return r;
    },
    keys: function () {
      return this.asArray(false);
    },
    values: function () {
      return this.asArray(true);
    },
    /** Convert object to string (TODO: Update docs)
      * @params {Object} o Configuration
      * @example
      * Object.asString({name: John, age: 18, loc: 'HR'}) => "name: John, age: 18, loc: HR"
      * Object.asString({name: John, age: 18, loc: 'HR'}, '=>') => "name=>John, age=>18, loc=>HR"
      * Object.asString({name: John, age: 18, loc: 'HR'}, '[', ']') => "name[John]age[18]loc[HR"
      */
    asString: function (o) {
      var no_escape_fn = function (str) { return str };
      var r = [], o = $.extend({
        equal: ': ',
        delimiter: ', ',
        value_escape: ['', '', no_escape_fn],
        key_escape: ['', '', no_escape_fn],
        escape_with: no_escape_fn
      }, o), s;

      if(typeof o.value_escape === 'string')
        o.value_escape = [o.value_escape, o.value_escape, o.escape_with];
      if(typeof o.key_escape === 'string')
        o.key_escape = [o.key_escape, o.key_escape, o.escape_with];
      if(!o.value_escape[2])
        o.value_escape[2] = o.escape_with;
      if(!o.key_escape[2])
        o.key_escape[2] = o.escape_with;

      this.each(function (k, v, h) {
        s = o.key_escape[0] + o.key_escape[2](k) + o.key_escape[1];
        s += o.equal;
        s += o.value_escape[0] + o.value_escape[2](v) + o.value_escape[1];
        r.push(s);
      });

      return r.join(o.delimiter);
    },
    /** Sorts an object by keys
      * @example
      * Object.sort({ivo: 3, ann: 11}) => {ann: 3, ivo: 11}
      * Object.sort({ann: 35, ivo: 3, dee: 1}, true) => {dee: 1, ivo: 3, ann: 35}
      */
    sort: function () {
      var a = this.toArray(false).sort(), r = {};

      /* TODO: Fix Hash.sort(by_value)! */
      var ak = this.toArray();

      $.each(a, function (n, v) {
        var k = ak[a.indexOf(v)];
        r[k] = v;
      });

      return new this.constructor(r);
    },
    /** Number of key-value pairs in this hash
      * @returns {Number} Length, 0 for no elements
      */
    size: function () {
      return this.asArray().length;
    },
    /** Is the object empty? (Faster than comparing .length === 0)
      * @returns {Boolean} true = Object is empty, false = Object is not empty
      * @example
      * $.H({nina: 1234, nana: false}).isEmpty === false
      * $.H().isEmpty === true
      */
    isEmpty: function() {
      return !this.asArray(false, 1).length;
    },
    /** Remove +undefined+ properties
      * @params {Boolean} [direct] If true that it will work on current instance, otherwise it will return new Hash
      * @returns {Hash}
      * @example
      * $.H({color: null, wow: true, r: 1, c: 0, s: undefined}).clean() === $.H({cikir: null, })
      */
    clean: function (direct) {
      var r = {};

      if(direct === true)
        return this.each(function (k, v, h) { if(v === undefined) delete h.del(k); });
      else
        this.each(function (k, v) { if(v !== undefined) r[k] = v });

      return new this.constructor(r);
    },
    /** Calculates diffrence between two hashes
      * @params {Hash|Object} b Hash or Object you whish to compare with this Hash
      * @params {Boolean} [direct] Defaults to +false+, when true current hash becomes difference
      * @returns {Hash} If direct is +true+ then current hash, else new Hash
      */
    diff: function (b, direct) {
      if(b instanceof this.constructor) b = b.hash;
      var a = this.hash, diff = $.extend({}, a, b);

      for(var method in diff)
        if(method in a && method in b && b[method] === a[method])
          delete diff[method];

      if(direct === true) {
        this.clear();
        JS.extend(this.hash, diff);
        return this;
      } else
        return new this.constructor(diff);
    },
    /** Deprecated! Returns new Object without Hash.prototype methods
      * @returns {Object}
      */
    strip: function () {
      console.warning("Calling Hash.strip", this, arguments.callee);
      return this.hash;
    },
    /** Clears current hash
      * @returns {Object} Current hash, just with Hash.prototype methods
      */
    clear: function () {
      return !!(this.hash = {});
    },
    /** Delete property from hash
      * @returns {Hash} Returns self
      */
    del: function (k) {
      delete this.hash[k];
      return this;
    },
    /** Rename property
      * @params {String|Number} old_key Old propety name
      * @params {String|Number} new_key New property name
      * @returns {Hash} Returns self
      */
    rename: function (old_key, new_key) {
      if(this.owns(old_key) && this.owns(new_key))
        return false;

      this.hash[new_key] = this.hash[old_key];
      delete this.hash[old_key];
      return this;
    },
    /** Returns hash property
      * @params {String|Number} key Property name
      * @returns +undefined+ if property belongs to Hash.prototype or doesen't exist
      */
    get: function (key) {
      return this.has(key) ? this.hash[key] : undefined;
    },
    has: function (key) {
      return key in this.hash;
    },
    /** Returns new Hash filled with properties which are equal to +val+
      * @params val
      * @returns {Hash}
      */
    getByValue: function (val) {
      var r = new this.consturctor();

      this.each(function (k, v, h) {
        if(v === val) r.set(k, v);
      });

      return r;
    },
    keysWithValue: function (val) {
      var keys = [];

      this.each(function (k, v, h) {
        if(v === val) keys.push(k);
      });

      return keys;
    }
  });

  Hash.is = function (obj) {
    return obj instanceof Hash;
  };

  Hash.fromKeysAndValues = function(ks, vs) {
    var h = new Hash(),
        n = ks.length;
    
    while(n--)
      h.set(ks[n], vs[n]);

    return h;
  };

  $.H = function (h) {
    return new Hash(h);
  };
  $.H.is = function (h) { return h instanceof Hash; };
  $.isH = function (h) { return h instanceof Hash; };
  $.H.fromKeysAndValues = Hash.fromKeysAndValues;
  
//})();

(function () {
  var r = /{(\w+)}/g;

  window._ = function (s, d) {
    if(!s)
      return "";
    if(!d)
      return s;
    if(Hash.is(d))
      d = d.hash;

    return s.replace(r, function (c, p) {
      return d[p] || "";
    });
  };
})();

(function () {
  Function.validators = {
    canBeUndef: function (conf, arg) {
      return !(conf === false && arg === undefined);
    },
    optional: function (conf, arg) {
      return conf === false && arg !== undefined;
    },
    validateWith: function (fn, arg) {
      return fn(arg);
    },
    isIn: function (obj, arg) {
      if(obj.constructor === Object)
        return arg in obj;
      if(obj.constructor === Array)
        return obj.contains(arg);
    },
    constr: function (constr, arg) {
      return arg.constructor === constr;
    },
    type: function (type, arg) {
      return typeof arg === type;
    }
  };

  with(Function.validators) {
    canBeUndef.msg    = "can't be undefined";
    optional.msg      = "isn't optional";
    validateWith.msg  = "didn't pass additional validation";
    isIn.msg          = "isn't member of {0}";
    constr.msg        = "has wrong constructor ({1} instead of {0})";
    type.msg          = "has wrong type ({1} instead of {0})"
  }

  Function.validateArguments = function (component, args, config) {
    if(!config && config.constructor !== Object)
      return false;

    var arg_confs, arg_conf, arg, msg, err_msg, p, o, v, validator;
    /* Argument -> Argument validators -> Validator */
    for(var n = 0, m = config.length; n < m; n++) {
      arg_confs = [].concat(config[n]);
      p = arg_confs.length;
      arg = args[n];
      msg = component + ": Argument #" + (n+1) + " ";

      while(p--) {
        o = arg_confs[p];
        for(v in o) {
          validator = Function.validators[v];
          if(!validator)
            continue;
          if(validator(o[v], arg) === false)
            throw new Error(msg + _(validator.msg, [o[v], arg]) + ".");
        }
      }
    }

    return false;
  };

  Function.is = function (obj) {
    return obj instanceof Function;
  };

  Function.blank = function () {};
})();

JS.extend($, {
  // For use with effects, as callback when animations finishes
  removeWhenDone: function () {
    return $(this).remove()
  }
})
