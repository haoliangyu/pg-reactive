'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.__RewireAPI__ = exports.__ResetDependency__ = exports.__set__ = exports.__Rewire__ = exports.__GetDependency__ = exports.__get__ = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rxjs = require('rxjs');

var _rxjs2 = _interopRequireDefault(_rxjs);

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _isObservable = require('is-observable');

var _isObservable2 = _interopRequireDefault(_isObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var pgrx = function () {

  /**
   * Initalize a database connection.
   * @param  {String|Object} config    PostgreSQL database connection string or config object
   * @param  {Object}        [options] Connection options
   */
  function pgrx(config, options) {
    _classCallCheck(this, pgrx);

    options = options || {};

    if (options.pool === false) {
      this._db = new (_get__('pg').Client)(config);
      this._db.connect();
      this._type = 'client';
    } else {
      if (typeof config === 'string') {
        var params = _get__('url').parse(config);
        var auth = params.auth.split(':');

        config = {
          user: auth[0],
          password: auth[1],
          host: params.hostname,
          port: params.port,
          database: params.pathname.split('/')[1]
        };
      }

      this._db = new (_get__('pg').Pool)(config);
      this._type = 'pool';
    }
  }

  /**
   * Close the current database connection.
   * @return {Undefined}  No return
   */


  _createClass(pgrx, [{
    key: 'end',
    value: function end() {
      this._db.end();
    }

    /**
     * Perform quary with optional parameters
     * @param  {String}         sql       Query SQL
     * @param  {Array}          [values]  Optional query parameters
     * @return {Rx.Observable}            Rx.Observable
     */

  }, {
    key: 'query',
    value: function query(sql, values) {
      var _this = this;

      if (!sql || typeof sql !== 'string') {
        throw new Error('Invalid queary: ' + sql);
      }

      if (values) {
        values = Array.isArray(values) ? values : [values];
      }

      if (this._type === 'client') {
        return this._deferQuery(this._db.query.bind(this._db), sql, values);
      } else {
        return _get__('Rx').Observable.defer(function () {
          return _get__('Rx').Observable.fromPromise(_this._db.connect());
        }).concatMap(function (client) {
          return _this._deferQuery(client.query.bind(client), sql, values, client.release.bind(client));
        });
      }
    }

    /**
     * Run database operations using a transaction.
     * @param  {Function} fn      A function that returns an observable for database operation.
     * @return {Rx.Observable}    Rx.Observable
     */

  }, {
    key: 'tx',
    value: function tx(fn) {
      var _this2 = this;

      if (typeof fn !== 'function') {
        throw new Error('Expect the input to be Function, but get ' + (typeof fn === 'undefined' ? 'undefined' : _typeof(fn)));
      }

      if (this._type === 'pool') {
        return _get__('Rx').Observable.defer(function () {
          return _get__('Rx').Observable.fromPromise(_this2._db.connect());
        }).concatMap(function (client) {
          var observable = fn({
            query: function query(sql, values) {
              return _this2._deferQuery(client.query.bind(client), sql, values);
            }
          });

          if (!_get__('isObservable')(observable)) {
            return _get__('Rx').Observable.throw(new Error('Expect the function to return Observable, but get ' + (typeof observable === 'undefined' ? 'undefined' : _typeof(observable))));
          }

          var queryFn = client.query.bind(client);

          return _get__('Rx').Observable.concat(_this2._deferQuery(queryFn, 'BEGIN;'), observable, _this2._deferQuery(queryFn, 'COMMIT;'), _get__('Rx').Observable.create(function (observer) {
            client.release();
            observer.complete();
          })).toArray().mergeMap(function (results) {
            var _get__$Observable;

            return (_get__$Observable = _get__('Rx').Observable).of.apply(_get__$Observable, _toConsumableArray(results));
          }).catch(function (err) {
            var query = queryFn('ROLLBACK;');

            return _get__('Rx').Observable.create(function (observer) {
              query.on('end', function () {
                client.release();
                observer.error(err);
              });
            });
          });
        });
      } else {
        var observable = fn({
          query: this.query.bind(this)
        });

        if (!_get__('isObservable')(observable)) {
          return _get__('Rx').Observable.throw(new Error('Expect the function to return Observable, but get ' + (typeof observable === 'undefined' ? 'undefined' : _typeof(observable))));
        }

        return _get__('Rx').Observable.concat(this.query('BEGIN'), observable, this.query('COMMIT')).toArray().mergeMap(function (results) {
          var _get__$Observable2;

          return (_get__$Observable2 = _get__('Rx').Observable).of.apply(_get__$Observable2, _toConsumableArray(results));
        }).catch(function (err) {
          var query = _this2._db.query('ROLLBACK;');

          return _get__('Rx').Observable.create(function (observer) {
            query.on('end', function () {
              return observer.error(err);
            });
          });
        });
      }
    }
  }, {
    key: '_deferQuery',
    value: function _deferQuery(queryFn, sql, values, cleanup) {
      return _get__('Rx').Observable.defer(function () {
        var query = queryFn(sql, values);

        return _get__('Rx').Observable.create(function (observer) {
          query.on('row', function (row) {
            return observer.next(row);
          });
          query.on('error', function (error) {
            return observer.error(error);
          });
          query.on('end', function () {
            return observer.complete();
          });

          return cleanup;
        });
      });
    }
  }]);

  return pgrx;
}();

exports.default = pgrx;

function _getGlobalObject() {
  try {
    if (!!global) {
      return global;
    }
  } catch (e) {
    try {
      if (!!window) {
        return window;
      }
    } catch (e) {
      return this;
    }
  }
}

;
var _RewireModuleId__ = null;

function _getRewireModuleId__() {
  if (_RewireModuleId__ === null) {
    var globalVariable = _getGlobalObject();

    if (!globalVariable.__$$GLOBAL_REWIRE_NEXT_MODULE_ID__) {
      globalVariable.__$$GLOBAL_REWIRE_NEXT_MODULE_ID__ = 0;
    }

    _RewireModuleId__ = __$$GLOBAL_REWIRE_NEXT_MODULE_ID__++;
  }

  return _RewireModuleId__;
}

function _getRewireRegistry__() {
  var theGlobalVariable = _getGlobalObject();

  if (!theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__) {
    theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__ = Object.create(null);
  }

  return __$$GLOBAL_REWIRE_REGISTRY__;
}

function _getRewiredData__() {
  var moduleId = _getRewireModuleId__();

  var registry = _getRewireRegistry__();

  var rewireData = registry[moduleId];

  if (!rewireData) {
    registry[moduleId] = Object.create(null);
    rewireData = registry[moduleId];
  }

  return rewireData;
}

(function registerResetAll() {
  var theGlobalVariable = _getGlobalObject();

  if (!theGlobalVariable['__rewire_reset_all__']) {
    theGlobalVariable['__rewire_reset_all__'] = function () {
      theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__ = Object.create(null);
    };
  }
})();

var INTENTIONAL_UNDEFINED = '__INTENTIONAL_UNDEFINED__';
var _RewireAPI__ = {};

(function () {
  function addPropertyToAPIObject(name, value) {
    Object.defineProperty(_RewireAPI__, name, {
      value: value,
      enumerable: false,
      configurable: true
    });
  }

  addPropertyToAPIObject('__get__', _get__);
  addPropertyToAPIObject('__GetDependency__', _get__);
  addPropertyToAPIObject('__Rewire__', _set__);
  addPropertyToAPIObject('__set__', _set__);
  addPropertyToAPIObject('__reset__', _reset__);
  addPropertyToAPIObject('__ResetDependency__', _reset__);
  addPropertyToAPIObject('__with__', _with__);
})();

function _get__(variableName) {
  var rewireData = _getRewiredData__();

  if (rewireData[variableName] === undefined) {
    return _get_original__(variableName);
  } else {
    var value = rewireData[variableName];

    if (value === INTENTIONAL_UNDEFINED) {
      return undefined;
    } else {
      return value;
    }
  }
}

function _get_original__(variableName) {
  switch (variableName) {
    case 'pg':
      return _pg2.default;

    case 'url':
      return _url2.default;

    case 'Rx':
      return _rxjs2.default;

    case 'isObservable':
      return _isObservable2.default;
  }

  return undefined;
}

function _assign__(variableName, value) {
  var rewireData = _getRewiredData__();

  if (rewireData[variableName] === undefined) {
    return _set_original__(variableName, value);
  } else {
    return rewireData[variableName] = value;
  }
}

function _set_original__(variableName, _value) {
  switch (variableName) {}

  return undefined;
}

function _update_operation__(operation, variableName, prefix) {
  var oldValue = _get__(variableName);

  var newValue = operation === '++' ? oldValue + 1 : oldValue - 1;

  _assign__(variableName, newValue);

  return prefix ? newValue : oldValue;
}

function _set__(variableName, value) {
  var rewireData = _getRewiredData__();

  if ((typeof variableName === 'undefined' ? 'undefined' : _typeof(variableName)) === 'object') {
    Object.keys(variableName).forEach(function (name) {
      rewireData[name] = variableName[name];
    });
  } else {
    if (value === undefined) {
      rewireData[variableName] = INTENTIONAL_UNDEFINED;
    } else {
      rewireData[variableName] = value;
    }

    return function () {
      _reset__(variableName);
    };
  }
}

function _reset__(variableName) {
  var rewireData = _getRewiredData__();

  delete rewireData[variableName];

  if (Object.keys(rewireData).length == 0) {
    delete _getRewireRegistry__()[_getRewireModuleId__];
  }

  ;
}

function _with__(object) {
  var rewireData = _getRewiredData__();

  var rewiredVariableNames = Object.keys(object);
  var previousValues = {};

  function reset() {
    rewiredVariableNames.forEach(function (variableName) {
      rewireData[variableName] = previousValues[variableName];
    });
  }

  return function (callback) {
    rewiredVariableNames.forEach(function (variableName) {
      previousValues[variableName] = rewireData[variableName];
      rewireData[variableName] = object[variableName];
    });
    var result = callback();

    if (!!result && typeof result.then == 'function') {
      result.then(reset).catch(reset);
    } else {
      reset();
    }

    return result;
  };
}

var _typeOfOriginalExport = typeof pgrx === 'undefined' ? 'undefined' : _typeof(pgrx);

function addNonEnumerableProperty(name, value) {
  Object.defineProperty(pgrx, name, {
    value: value,
    enumerable: false,
    configurable: true
  });
}

if ((_typeOfOriginalExport === 'object' || _typeOfOriginalExport === 'function') && Object.isExtensible(pgrx)) {
  addNonEnumerableProperty('__get__', _get__);
  addNonEnumerableProperty('__GetDependency__', _get__);
  addNonEnumerableProperty('__Rewire__', _set__);
  addNonEnumerableProperty('__set__', _set__);
  addNonEnumerableProperty('__reset__', _reset__);
  addNonEnumerableProperty('__ResetDependency__', _reset__);
  addNonEnumerableProperty('__with__', _with__);
  addNonEnumerableProperty('__RewireAPI__', _RewireAPI__);
}

exports.__get__ = _get__;
exports.__GetDependency__ = _get__;
exports.__Rewire__ = _set__;
exports.__set__ = _set__;
exports.__ResetDependency__ = _reset__;
exports.__RewireAPI__ = _RewireAPI__;