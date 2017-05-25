import reduxMiddleware, {
  decycle,
  setToValue,
  sanitize
} from './index'

test('non-errors are ignored', () => {
  let store = jest.fn()
  let next = jest.fn()
  let Rollbar = jest.fn()
  let middleware = reduxMiddleware(Rollbar)

  let action = {
    type: 'NOT_AN_ERROR',
    payload: {a: 1}
  }

  middleware(store)(next)(action)

  expect(next).toBeCalledWith(action)
  expect(Rollbar).not.toHaveBeenCalled()
})

describe('with an error', () => {
  let action = {
    type: 'THIS_IS_BROKEN',
    payload: new Error('bork'),
    error: true
  }
  let store = {
    getState: jest.fn(() => {
      return {
        a: 1,
        b: 42
      }
    })
  }
  let next = jest.fn()
  let Rollbar = {
    error: jest.fn()
  }
  let middleware = reduxMiddleware(Rollbar)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rollbar is called', () => {
    middleware(store)(next)(action)
    expect(Rollbar.error).toHaveBeenCalled()
  })

  test('rollbar gets the expected data', () => {
    middleware(store)(next)(action)
    expect(Rollbar.error).toBeCalledWith(action.payload, {state: '{"a":1,"b":42}'})
  })

  test('the store has its state fetched', () => {
    middleware(store)(next)(action)
    expect(store.getState).toHaveBeenCalled()
  })

  test('next is still called', () => {
    middleware(store)(next)(action)
    expect(next).toBeCalledWith(action)
  })
})

describe('with an error and keypaths', () => {
  let action = {
    type: 'THIS_IS_BROKEN',
    payload: new Error('bork'),
    error: true
  }
  let store = {
    getState: jest.fn(() => {
      return {
        a: 1,
        b: 42
      }
    })
  }
  let next = jest.fn()
  let Rollbar = {
    error: jest.fn()
  }
  let keyPaths = ['a']
  let middleware = reduxMiddleware(Rollbar, keyPaths)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rollbar is called', () => {
    middleware(store)(next)(action)
    expect(Rollbar.error).toHaveBeenCalled()
  })

  test('rollbar gets the expected data', () => {
    middleware(store)(next)(action)
    expect(Rollbar.error).toBeCalledWith(action.payload, {state: '{"a":"********","b":42}'})
  })

  test('the store has its state fetched', () => {
    middleware(store)(next)(action)
    expect(store.getState).toHaveBeenCalled()
  })

  test('next is still called', () => {
    middleware(store)(next)(action)
    expect(next).toBeCalledWith(action)
  })
})

describe('decycle', () => {
  test('a normal object works', () => {
    let normalObject = {a: {b: 1}, d: [1,2,3]}
    let str = '{"a":{"b":1},"d":[1,2,3]}'
    expect(decycle(normalObject)).toBe(str)
  })

  test('an object with a cycle is stringified', () => {
    let obj = {a: 1, c: {a: 1}}
    obj.b = obj
    let str = '{"a":1,"c":{"a":1}}'
    expect(decycle(obj)).toBe(str)
  })
  
  test('a non-object works', () => {
    expect(decycle(undefined)).toBe(undefined)
    expect(decycle(null)).toBe('null')
    expect(decycle(42)).toBe('42')
  })
})

describe('setToValue', () => {
  test('null input', () => {
    let obj = null
    setToValue(obj, 42, 'a')
    expect(obj).toBe(null)
  })
  test('undefined input', () => {
    let obj = undefined
    setToValue(obj, 42, 'a')
    expect(obj).toBe(undefined)
  })
  test('string input', () => {
    let obj = 'some string'
    setToValue(obj, 42, 'a')
    expect(obj).toBe('some string')
  })
  test('simple object key exists', () => {
    let obj = {a: 1}
    setToValue(obj, 42, 'a')
    expect(obj.a).toBe(42)
  })
  test('simple object key missing', () => {
    let obj = {a: 1}
    setToValue(obj, 42, 'b')
    expect(obj.a).toBe(1)
    expect(obj.b).toBe(42)
  })
  test('deep object key exists', () => {
    let obj = {a: {b: {c: 'hello', y: 'bork'}, d: {e: 42}}, x: 99}
    setToValue(obj, 'world', 'a.b.c')
    expect(obj.a.b.c).toBe('world')
    expect(obj.a.b.y).toBe('bork')
    expect(obj.a.d.e).toBe(42)
    expect(obj.x).toBe(99)
  })
  test('deep object key missing at end', () => {
    let obj = {a: {b: {c: 'hello', y: 'bork'}, d: {e: 42}}, x: 99}
    setToValue(obj, 'world', 'a.b.z')
    expect(obj.a.b.c).toBe('hello')
    expect(obj.a.b.z).toBe('world')
    expect(obj.a.b.y).toBe('bork')
    expect(obj.a.d.e).toBe(42)
    expect(obj.x).toBe(99)
  })
  test('deep object key missing in middle', () => {
    let obj = {a: {b: {c: 'hello', y: 'bork'}, d: {e: 42}}, x: 99}
    setToValue(obj, 'world', 'a.z.x')
    expect(obj.a.b.c).toBe('hello')
    expect(obj.a.z.x).toBe('world')
    expect(obj.a.b.y).toBe('bork')
    expect(obj.a.d.e).toBe(42)
    expect(obj.x).toBe(99)
  })
})

describe('sanitize', () => {
  test('if keyPaths is a function it just calls is', () => {
    let keyPaths = jest.fn((state) => {
      return Object.assign({bork: true}, state)
    })
    let state = {a: 1}
    let newState = sanitize(keyPaths, state)
    expect(newState.a).toBe(1)
    expect(newState.bork).toBe(true)
  })
  test('if keyPaths is an array, it replaces what it should', () => {
    let keyPaths = ['a.b', 'c.d', 'e']
    let state = {a: {b: 'bad', x: 'good'}, c: {d: 'bad2', y: 'good2'}, e: 'worst', f: 'bork'}
    let newState = sanitize(keyPaths, state)
    expect(state.a.b).toBe('bad')
    expect(newState.a.b).toBe('********')
    expect(newState.a.x).toBe('good')
    expect(state.c.d).toBe('bad2')
    expect(newState.c.d).toBe('********')
    expect(newState.c.y).toBe('good2')
    expect(state.e).toBe('worst')
    expect(newState.e).toBe('********')
    expect(newState.f).toBe('bork')
  })
})
