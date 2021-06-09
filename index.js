"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createMiddleware;
exports.sanitize = exports.setToValue = exports.decycle = void 0;

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var decycle = function decycle(obj) {
  var cache = [];
  var stringified = JSON.stringify(obj, function (key, value) {
    if (_typeof(value) === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        return;
      }

      cache.push(value);
    }

    return value;
  });
  cache = null;
  return stringified;
};

exports.decycle = decycle;

var setToValue = function setToValue(obj, value, path) {
  if (!obj || _typeof(obj) !== 'object') {
    return;
  }

  path = path.split('.');
  var tmp = obj;

  for (var i = 0, len = path.length; i < len - 1; i++) {
    obj = Object.assign({}, obj[path[i]]);
    tmp[path[i]] = obj;
    tmp = obj;
  }

  obj[path[i]] = value;
};

exports.setToValue = setToValue;

var sanitize = function sanitize(state, keyPaths) {
  if (typeof keyPaths === 'function') {
    return keyPaths(state);
  }

  var replacement = '********';
  var updatedState = Object.assign({}, state);

  for (var i = 0, len = keyPaths.length; i < len; i++) {
    setToValue(updatedState, replacement, keyPaths[i]);
  }

  return updatedState;
};

exports.sanitize = sanitize;

var isError = function isError(action) {
  return action.error === true;
};

var stateForError = function stateForError(s, ks) {
  return ks ? decycle(sanitize(s, ks)) : decycle(s);
};

function createMiddleware(Rollbar, keyPaths, wrapAction) {
  return function (store) {
    return function (next) {
      return function (action) {
        if (!isError(action)) {
          if (wrapAction) {
            try {
              return next(action);
            } catch (err) {
              return Rollbar.error(err, {
                action: decycle(action),
                state: stateForError(store.getState(), keyPaths)
              });
            }
          }

          return next(action);
        }

        Rollbar.error(action.payload, {
          state: stateForError(store.getState(), keyPaths)
        });
        return next(action);
      };
    };
  };
}
