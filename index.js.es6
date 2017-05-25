const decycle = (obj) => {
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

const setToValue = (obj, value, path) => {
  if (!obj || typeof obj !== 'object') {
    return
  }
  path = path.split('.')
  for (var i = 0, len = path.length; i < len - 1; i++) {
    obj = obj[path[i]]
    if (!obj || typeof obj !== 'object') {
      return
    }
  }
  obj[path[i]] = value
}

const sanitize = (keyPaths, state) => {
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

export default function createMiddleware(Rollbar, keyPaths) {
  return store => next => action => {
    if (!isError(action)) {
      return next(action)
    }

    let stateToSend = store.getState()
    if (keyPathsOrFunction) {
      stateToSend = sanitize(keyPaths, stateToSend)
    }

    const decycledState = decycle(stateToSend)

    Rollbar.error(action.payload, {
      state: decycledState,
    })

    return next(action)
  }
}
