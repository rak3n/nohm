"use strict";

var sys = require('sys'),
Class = require('class').Class,
redis = require('redis-client').createClient(),
Conduct = require('conductor');

var prefix = 'nohm',
urlRegexp = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
emailRegexp = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;

/**
 * Model Class ;)
 *
 * Note: properties/methods starting with __ are for internal use and should not be called from the outside. Crockford says this is bad (and it is), but I don't care right now. Maybe change it sometime. :P
 **/

var ModelClass = {
  properties: {},

  modelName: 'Model',

  id: null,
  __inDB: false,

  errors: {},

  /**
   *  Main constructor. Initializes the object.
   */
  constructor: function constuctor() {
    var tmp, p;

    if (this.modelName === 'Model') {
      throw 'modelName has to be set to your models name!';
    }

    this.p = this.prop = this.property; // create short calls

    // initialize the properties
    for (p in this.properties) {
      if (this.properties.hasOwnProperty(p)) {
        tmp = this.properties[p];
        this.property(p, tmp.value || 0); // this ensures typecasing/behaviours
        tmp.__updated = false;
        tmp.__oldValue = tmp.value;
        this.properties[p] = tmp;
        this.errors[p] = [];
      }
    }

    this.id = null;
    this.__inDB = false;
  },

  logError: function logError(err) {
    if (err) {
      sys.debug('Nohm: Adding an index resulted in a redis error: ' + sys.inspect(err));
      // TODO: add some kind of persistent logging for errors.
    }
  },

  /**
   *  Saves the object by either creating, or updating it.
   */
  save: function save(callback) {
    var self = this;
    if (!this.valid()) {
      if (typeof callback === 'function') {
        callback('invalid');
      }
    } else {
      if (!self.id) {
        self.__create(callback);
      } else {
        self.__update(false, callback);
      }
    }
  },

  /**
   *  Check whether all properties marked as unique have a value that is not set in the database yet.
   *  Note: This instantly grabs those unique slots and only frees them, if there was a property that isn't unique. It does not remove the old unique values!
   */
  __checkUniques: function __checkUniques(saveCallback) {
    /*
     * This is a bit of a fuckup...
     * This code essentially creates an object with functions (redis checks) that will run in parrallel and when all those are done a final check of the redis returns is done.
     */
    var functions = {},
    tmp = this.properties,
    self = this,
    i = 0,
    finalArgs = [],
    initArgs = [],
    tmpUniques = [],
    success = true,
    p, doit,
    uniqueLocker = function uniqueLocker(propName, callback) {
      if (!self.id) {
        self.logError('Checking for uniques without having an id set. self:' + sys.inspect(self));
      }
      redis.setnx(prefix + ':uniques:' + self.modelName + ':' + propName + ':' + self.p(propName), self.id, function (err, value) {
        /*
         * We lock the unique value here if it's not locked yet, then later remove the old uniquelock when really saving it. (or we free the unique slot if we're not saving)
         */
        tmpUniques.push(prefix + ':uniques:' + self.modelName + ':' + propName + ':' + self.p(propName));
        callback(err, {
          p: propName,
          unique: !!value
        });
      });
    };
    for (p in tmp) {
      if (tmp[p].unique === true && (tmp[p].__updated || self.id === null)) {
        i++;
        finalArgs.push(p + '1');
        initArgs.push(p);

        functions[p] = ['_' + i, uniqueLocker];
      }
    }
    if (functions.length === 0) {
      saveCallback(true);
    } else {
      finalArgs.push(function () {
        var r, i, len;
        for (r in arguments) {
          if (! arguments[r].unique) {
            self.errors[arguments[r].p].push('notUnique');
            success = false;
          }
        }
        if (! success) {
          for (i = 0, len = tmpUniques.length; i < len; i++) {
            // delete tmp unique locks since the new values won't be saved.
            redis.del(tmpUniques[i]);
          }
        }
        saveCallback(success);
      });
      functions.finalFunc = finalArgs;
      doit = new Conduct(functions);
      doit.apply(doit, initArgs);
    }
  },

  /**
   *  Creates a new empty (!) dataset in the database and calls __update to populate it.
   */
  __create: function __create(callback) {
    var self = this;
    redis.incr(prefix + ':ids:' + this.modelName, function (err, newId) {
      if (!err) {
        self.id = newId;
        self.__update(true, callback);
      } else {
        sys.debug('Nohm: Creating an object resulted in a redis error: ' + sys.inspect(err));
        if (typeof callback === 'function') {
          callback(err);
        } else {
          throw err;
        }
      }
    });
  },

  /**
   *  Update an existing dataset with the new values.
   */
  __update: function __update(all, callback) {
    var args = [prefix + ':hashes:' + this.modelName + ':' + this.id],
    props = this.properties,
    self = this;
    this.__checkUniques(function (unique) {
      var p;
      if (! unique) {
        if (typeof callback === 'function') {
          callback('notUnique');
        } else {
          sys.debug('Object has duplicate properties that need to be unique and no callback specified.');
        }
      } else {
        for (p in props) {
          if (all || props[p].__updated) {
            args.push(p);
            args.push(props[p].value);
          }
        }
        args.push(function realUpdate(err) {
          if (!err) {
            for (var p in props) {
              if (props.hasOwnProperty(p)) {
                // free old uniques
                if (props[p].unique === true && props[p].__updated) {
                  if (self.__inDB) {
                    redis.del(prefix + ':uniques:' + self.modelName + ':' + p + ':' + props[p].__oldValue, self.logError);
                  }
                }
                if (props[p].index === true && props[p].__updated) {
                  if (self.__inDB) {
                    redis.srem(prefix + ':index:' + self.modelName + ':' + p + ':' + props[p].__oldValue, self.id, self.logError);
                  }
                  redis.sadd(prefix + ':index:' + self.modelName + ':' + p + ':' + props[p].value, self.id, self.logError);
                }
          self.__inDB = true;
                self.property(p, props[p].value || 0); // this ensures typecasing/behaviours
                props[p].__updated = false;
                props[p].__oldValue = props[p].value;
                self.errors[p] = [];
              }
            }
          }
          // call the provided callback. we do this here instead of nested in the dels/srems/sadds above to speed things a little up. this means there might be problems that you only see if you look at the logger. :/
          if (typeof callback === 'function') {
            callback(err);
          } else if (err) {
            sys.debug('Nohm: Updating an object resulted in a redis error: ' + sys.inspect(err));
            throw err;
          }
        });
        redis.hmset.apply(redis, args);
      }
    });
  },

  /**
   *  Remove an objet from the database.
   *  Note: Does not destroy the object or its properties itself!
   */
  remove: function remove(callback) {
    var self = this;
    redis.del(prefix + ':hashes:' + self.modelName + ':' + this.id, function (err) {
      for (var p in self.properties) {
        if (self.properties[p].unique === true) {
          redis.del(prefix + ':uniques:' + self.modelName + ':' + p + ':' + self.properties[p].__oldValue);
        }
      }
      if (typeof callback === 'function') {
        callback(err);
      } else if (err) {
        sys.debug('Nohm: Deleting an object resulted in a redis error: ' + sys.inspect(err));
        throw err;
      }
    });
  },

  /**
   *  Get or set a property.
   *  This automatically invokes typecasting and behaviours.
   *  If you pass true as the third parameter, the property is instantly checked for validity.
   */
  property: function property(key, val, validate) {
    var tmp, old;

    if (!this.properties[key]) {
      throw 'Trying to access undefined property "' + key + '" of object "' + this.modelName + '".'; // TODO: maybe implement a custom exception object that has stuff like loggers and such
    }
    tmp = this.properties[key];
    if (typeof val === 'undefined') {
      return tmp.value;
    } else if (val !== tmp.value) {
      old = tmp.value;
      tmp.value = this.__cast(key, val);
      if (validate) {
        if (!this.valid(key)) {
          tmp.value = old;
          return false;
        }
      }
      if (val === tmp.__oldValue) {
        tmp.__updated = false;
      } else {
        tmp.__updated = true;
      }
    }
    return true;
  },

  /**
   *  Casts a property to a certain datatype. (Might cause unexpected results. Behaviours offer greater control over what happens.)
   *  Currently supported: raw (default, no casting needed ;) ), string, integer
   */
  __cast: function __cast(key, value) {
    if (!this.properties[key]) {
      throw 'Trying to access undefined property "' + key + '" of object "' + this.modelName + '".'; // TODO: mybe implement a custom exception object that has stuff like loggers and such
    }
    // TODO: implement behaviours after casting
    var type = this.properties[key].type;
    switch (type) {
    case 'string':
      // no .toString() here. TODO: or should there be?
      return (
              (!(value instanceof String) ||
               value.toString() === '') && typeof value !== 'string'
              ) ? ''
                : value;
    case 'integer':
      return (+value);
    default:
      return value;
    }
  },

  /**
   * Get an array of all properties that have been changed.
   */
  propertyDiff: function propertyDiff(key) {
    var diff = [],
    p;
    if (key && !this.properties[key]) {
      throw 'Invalid key specified for diffProperty';
    }

    for (p in this.properties) {
      if (!key || p === key) {
        if (this.properties[p].__updated) {
          diff.push({
            key: p,
            before: this.properties[p].__oldValue,
            after: this.properties[p].value
          });
        }
      }
    }
    return diff;
  },

  /**
   *  Resets the values of all or one propert(y/ies).
   */
  propertyReset: function propertyReset(key) {
    if (key && !this.properties[key]) {
      throw 'Invalid key specified for diffProperty';
    }

    for (var p in this.properties) {
      if (!key || p === key) {
        this.properties[p].__updated = false;
        this.properties[p].value = this.properties[p].__oldValue;
      }
    }
    return true;
  },

  /**
   *  Get all properties with values either as an array or as json (param true)
   */
  allProperties: function allProperties(json) {
    var props = {},
    p;
    for (p in this.properties) {
      if (this.properties.hasOwnProperty(p)) {
        props[p] = this.properties[p].value;
      }
    }
    return json ? JSON.stringify(props) : props;
  },

  /**
   *  Check if one or all propert(y/ies) are valid.
   */
  valid: function valid(key) {
    var validbool = true,
    p;
    for (p in this.properties) {
      if (!key || key === p) {
        if (!this.__validateProperty(p)) {
          validbool = false;
        }
      }
    }
    return validbool;
  },

  /**
   *  Validates a given property.
   */
  __validateProperty: function __validateProperty(p) {
    if (!p || !this.properties[p]) {
      throw 'Trying to validate undefined property or accessing __validateProperty without giving a property';
    }
    if (!this.properties[p].validations) {
      return true;
    }
    var value = this.properties[p].value,
    validations = this.properties[p].validations,
    errors = this.errors; // fight the scope!
    return validations.every(function (i) {
      var valid,
      errorName = '';
      if (typeof i === 'function') {
        valid = i(value);
        errorName = 'custom';
      } else if (typeof i === 'string') {
        if (!ModelClass.__validations[i]) {
          throw 'Trying to access unavailable validator.';
        }
        valid = ModelClass.__validations[i](value, []);
        errorName = i;
      } else if (i instanceof Array) {
        if (typeof i[0] === 'function') {
          valid =  i[0](value, i.slice(1) || []);
        }
        if (!ModelClass.__validations[i[0]]) {
          throw 'Trying to access unavailable validator.';
        }
        valid = ModelClass.__validations[i[0]](value, i.slice(1));
        errorName = i[0];
      }
      if (!valid) {
        errors[p].push(errorName);
      }
      return !!valid;
    });
  },

  __validations: {
    // most of these are copied from the jquery validation plugin http://code.google.com/p/bassistance-plugins/source/browse/trunk/plugins/validate/jquery.validate.js

    /**
     * Make sure a value is not empty.
     */
    notEmpty: function notEmpty(value) {
      return (value && value !== true);
    },

    /**
     * Make sure a value is of at least a given length (params[0]) or is optional (params[1]) and empty
     */
    minLength: function minLength(value, params) {
      return (params[1] && !value) || ('' + value).trim().length >= params[0];
    },

    /**
     * Make sure a value is of at most a given length (params[0])
     */
    maxLength: function maxLength(value, params) {
      return ('' + value).trim().length <= params[0];
    },

    /**
     * Make sure a value is of at least a given value (params[0])  (pun intended :P ) or is optional (params[1]) and zero
     */
    min: function min(value, params) {
      return (params[1] && value === 0) || (+value) >= params[0];
    },

    /**
     * Make sure a value is of at most a given value (params[0])
     */
    max: function max(value, params) {
      return (+value) <= params[0];
    },

    /**
     * Make sure a value is a valid email adress or empty if it's optional (params[0])
     */
    email: function email(value, params) {
      return (!value && params[0]) || emailRegexp.test(value);
    },

    /**
     * Make sure a value is a valid url or empty if it's optional (params[0])
     */
    url: function url(value, params) {
      // the fuck is this?
      // well, it's copied from jqueries validation plugin and i blindly trust them.
      return (!value && params[0]) || urlRegexp.test(value);
    },

    /**
     * Make sure a value is a date that the Date object can feed on or is optional (params[0]) and empty
     */
    date: function date(value, params) {
      return (params[0] && !value) || !/Invalid|NaN/.test(new Date(value));
    },

    /**
     * Make sure a value is a valid ISO Date (YYYY-MM-DD) or is optional (params[0]) and empty
     */
    dateISO: function dateISO(value, params) {
      return (params[0] && !value) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(value);
    },

    /**
     * Make sure a value is a valid US number (thousands seperator comma, decimal seperator point) string or is optional (params[0]) and empty
     */
    numberUS: function numberUS(value, params) {
      return (params[0] && !value) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
    },

    /**
     * Make sure a value is a valid EU number (thousands seperator point, decimal seperator comma) string or is optional (params[0]) and empty
     */
    numberEU: function numberEU(value, params) {
      return (params[0] && !value) || /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:\,\d+)?$/.test(value);
    },

    /**
     * Make sure a value is a valid SI number (thousands seperator space, decimal seperator point or comma) string or is optional (params[0]) and empty
     */
    numberSI: function numberSI(value, params) {
      return (params[0] && !value) || /^-?(?:\d+|\d{1,3}(?: \d{3})+)(?:[\,\.]\d+)?$/.test(value);
    },

    /**
     * Make sure a value is a valid (SI, US or EU) number string or is optional (params[0]) and empty
     */
    number: function number(value, params) {
      return (params[0] && !value) || this.numberSI(value, []) || this.numberUS(value, []) || this.numberEU(value, []); // could add asian number formats. anyone? :D
    },

    /**
     * Please don't use this. Cast your property to an integer.
     *
     * The only valid use of this is a string of so many digits that an int can't hold it anymore. Why would you want to do that?
     */
    digits: function digits(value, params) {
      return (params[0] && !value) || /^\d+$/.test(value);
    }
  }

};


exports.Model = new Class(ModelClass);