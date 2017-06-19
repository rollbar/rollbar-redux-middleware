export const decycle = (obj) => {
  let cache = []

  const stringified = JSON.stringify(obj, function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        return
      }
      cache.push(value)
    }
    return value
  })
  cache = null

  return stringified
}

export const setToValue = (obj, value, path) => {
  if (!obj || typeof obj !== 'object') {
    return
  }
  path = path.split('.')
  var tmp = obj;
  for (var i = 0, len = path.length; i < len - 1; i++) {
    obj = Object.assign({}, obj[path[i]])
    tmp[path[i]] = obj
    tmp = obj
  }
  obj[path[i]] = value
}

export const sanitize = (state, keyPaths) => {
  if (typeof keyPaths === 'function') {
    return keyPaths(state)
  }

  const replacement = '********'
  var updatedState = Object.assign({}, state)
  for (var i = 0, len = keyPaths.length; i < len; i++) {
    setToValue(updatedState, replacement, keyPaths[i])
  }
  return updatedState
}

const isError = (action) => action.error === true
const stateForError = (s, ks) => ks ? decycle(sanitize(s, ks)) : decycle(s)

export default function createMiddleware(Rollbar, keyPaths, wrapAction) {
  return store => next => action => {
    if (!isError(action)) {
      if (wrapAction) {
        try {
          return next(action)
        } catch (err) {
          return Rollbar.error(err, {
            action: decycle(action),
            state: stateForError(store.getState(), keyPaths)
          })
        }
      }
      return next(action)
    }

    Rollbar.error(action.payload, {
      state: stateForError(store.getState(), keyPaths)
    })

    return next(action)
  }
}
