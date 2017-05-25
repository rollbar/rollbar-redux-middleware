# rollbar-redux-middleware

Redux middleware that integrates with [Rollbar](https://rollbar.com/docs/notifier/rollbar.js/). This middleware assumes the use of 
actions that conform to the [Flux Standard Action](https://github.com/acdlite/flux-standard-action) pattern. Essentially this means
that actions of the following form

```js
{
    error: true,
    payload: new Error()
}
```

are considered errors to be reported to Rollbar where the error is in the payload field. Only if there is a key of `error` with a
value equal to `true` will this middleware send anything to Rollbar. We include the payload as well as the entire redux store state.

__We provide mechanisms for easily santizing the store before logging (e.g. if you store access tokens in the redux store).__

## Installation

Run `npm install --save rollbar-redux-middleware`.

## Usage

Import `rollbarMiddleware` function from package:

```js
import rollbarMiddleware from 'rollbar-redux-middleware';
```

Import `rollbar` and configure:
```js
import rollbar from 'rollbar';
var Rollbar = new rollbar({accessToken: 'POST_CLIENT_ITEM_ACCESS_TOKEN'});
```

Create middleware in your store creator:
```js
export default function configureStore(initialState) {
  const rollbarRedux = rollbarMiddleware(Rollbar);

  return createStore(
    rootReducer,
    initialState,
    applyMiddleware(rollbarRedux)
  );
}
```

## State sanitization
Consider the following state:

```js
{
  user: {
    credentials: {
      token: 'ABC123',
      name: 'Bob User'
    },
    (...)
  },
  billing: {
    number: '1234 1234 1234 1234',
    (...)
  },
  (...)
}
```

If you want to sanitize the state before sending to Rollbar, we provide two mechanisms. The first is
to include an array of keypaths that you wish to redact:

```js
const keyPaths = [
  'billing.number',
  'user.credentials.token'
]
```

Then just pass this as the second parameter to `rollbarMiddleware`:

```js
const rollbarRedux = rollbarMiddleware(Rollbar, keyPaths)
```

Alternatively, you can pass a function as the second argument to the `rollbarMiddleware` function.
It accepts current application state and should return a state that will be sent to Rollbar.

To sanitize the example state above the same as the given keypaths, the function provided should be 
similar to:

```js
const stateSanitizer = function(state) {
  // make sure you don't change state tree
  const stateCopy = Object.assign({}, state);
  // make sure you don't change billing object (by reference)
  const billingCopy = Object.assign({}, stateCopy.billing);
  // override number in billing copy
  billingCopy.number = '********';
  // pass billing copy to state copy
  stateCopy.billing = billingCopy;

  // similarly
  const userCopy = Object.assign({}, stateCopy.user);
  const credentialsCopy = Object.assign({}, userCopy.credentials)
  credentialsCopy.token = '********'
  userCopy.credentials = credentialsCopy;
  stateCopy.user = userCopy;

  // return sanitized state
  return stateCopy;
}

export default function configureStore(initialState) {
  const rollbarRedux = rollbarMiddleware(Rollbar, stateSanitizer);

  return createStore(
    rootReducer,
    initialState,
    applyMiddleware(rollbarRedux)
  );
}
```

