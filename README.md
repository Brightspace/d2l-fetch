# d2l-fetch
Provides support for wrapping window.fetch calls within middleware functions.

## Setup

```sh
npm ci
```

## Usage

Reference the script in your html:

```html
<script type="module" src="../d2l-fetch/d2l-fetch.js"></script>
```

This will add a `d2lfetch` object to the global scope, with two methods: `use` and `fetch`.

Alternatively, you can reference the global d2lfetch instance via es6 import

```javascript
import { d2lfetch } from '../d2l-fetch/src/index.js';
```

### Use

Use the 'use' function to append functions to the middleware chain. These functions will be executed in the order they are 'use'd.

Each middleware function will be passed two parameters: a Request object and the next function in the middleware to be executed. Unless
you wish to exit the chain early your middleware should execute the next function during its own execution and return the result.

Example:

```js
var myMiddlewareFunc = (request, next) => {
	// Do something with the request, like maybe add a custom header
	request.headers.set('X-My-Custom-Header', 'hello');

	// Continue to the next function in the chain
	var response = next(request);

	// If you want you can do something with the response now, or not, up to you
	// in this example we'll just return it back up the chain

	return response;
};

window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});
```

If you do wish to exit the chain early no further middleware will be executed, nor will the `window.fetch` call. You should return a Promise with
your desired output (keep in mind that callers are probably expecting it to contain a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)).

Example:

```js
var myEarlyExitFunc = (request, next) => {
	// Check if we have a cached response for this request
	if (CACHED_RESPONSES[request.url]) {
		// Return what we have, this will skip further
		// middleware functions as well as the `window.fetch` call
		return Promise.resolve(CACHED_RESPONSES[request.url]);
	}

	// We've got nothing so continue to the next function in the chain
	return next(request);
};

window.d2lfetch.use({name: 'myEarlyExitName', fn: myEarlyExitFunc});
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc}); // this may never get called
```

### Fetch

Use the `fetch` function to execute the middleware chain followed by a [`window.fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) call. Returns the `Promise` result of the `window.fetch` call or whatever result was returned by any middleware that exited early from the chain.

Example:

```js
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});

window.d2lfetch.fetch(new Request('http://www.example.com/api/stuff'))
	.then(function(response) {
		// do something with the response
	})
	.catch(function(reason) {
		console.log(reason);
	});
```

### AddTemp

Use the `addTemp` function to temporarily add middleware to the middleware chain. Returns a new `D2LFetch` object with the updated middleware chain.

Example:

```js
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});

window.d2lfetch
	.addTemp({
		name: 'addedMiddlewareName',
		fn: function() {
			// added middleware functionality
		}
	})
	.fetch(new Request('http://www.example.com/api/stuff'))
	.then(function(response) {
		// do something with the response
	})
	.catch(function(reason) {
		console.log(reason);
	});
```

If you want to have the temporary middleware added to the beginning of the middleware chain, you can pass `prepend: true` into the options object.

Example:

```js
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});

window.d2lfetch
	.addTemp(
		{ name: 'addedMiddlewareName', fn: function() { /* added middleware functionality */ } },
		{ prepend: true }
	)
```

### RemoveTemp

Use the `removeTemp` function to temporarily remove a specified middleware from the middleware chain. Returns a new `D2LFetch` object with the updated middleware chain.

Example:

```js
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});

window.d2lfetch
	.removeTemp('myMiddlewareName')
	.fetch(new Request('http://www.example.com/api/stuff'))
	.then(function(response) {
		// do something with the response
	})
	.catch(function(reason) {
		console.log(reason);
	});
```

`addTemp` and `removeTemp` can be chain called together like so:

```js
window.d2lfetch.use({name: 'myMiddlewareName', fn: myMiddlewareFunc});

window.d2lfetch
	.addTemp({
		name: 'tempMiddlewareName',
		fn: function() {
			// ...
		}
	})
	.addTemp(
		{
		name: 'moreTempMiddlewareName',
		fn: function() {
			// ...
		}
	})
	.removeTemp('myMiddlewareName')
	.fetch(new Request('http://www.example.com/api/stuff'))
	.then(function(response) {
		// do something with the response
	})
	.catch(function(reason) {
		console.log(reason);
	});
```

## Browser compatibility

`d2l-fetch` makes use of two javascript features that are not yet fully supported across all modern browsers: the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). If you need to support browsers that do not yet implement these features you will need to include polyfills for this functionality.

We recommend:

* [fetch](https://github.com/github/fetch)
* [promise-polyfill](https://github.com/PolymerLabs/promise-polyfill/)

## Versioning & Releasing

> TL;DR: Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`. Read on for more details...

The [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) is called from the `release.yml` GitHub Action workflow to handle version changes and releasing.

### Version Changes

All version changes should obey [semantic versioning](https://semver.org/) rules:
1. **MAJOR** version when you make incompatible API changes,
2. **MINOR** version when you add functionality in a backwards compatible manner, and
3. **PATCH** version when you make backwards compatible bug fixes.

The next version number will be determined from the commit messages since the previous release. Our semantic-release configuration uses the [Angular convention](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular) when analyzing commits:
* Commits which are prefixed with `fix:` or `perf:` will trigger a `patch` release. Example: `fix: validate input before using`
* Commits which are prefixed with `feat:` will trigger a `minor` release. Example: `feat: add toggle() method`
* To trigger a MAJOR release, include `BREAKING CHANGE:` with a space or two newlines in the footer of the commit message
* Other suggested prefixes which will **NOT** trigger a release: `build:`, `ci:`, `docs:`, `style:`, `refactor:` and `test:`. Example: `docs: adding README for new component`

To revert a change, add the `revert:` prefix to the original commit message. This will cause the reverted change to be omitted from the release notes. Example: `revert: fix: validate input before using`.

### Releases

When a release is triggered, it will:
* Update the version in `package.json`
* Tag the commit
* Create a GitHub release (including release notes)
* Deploy a new package to NPM

### Releasing from Maintenance Branches

Occasionally you'll want to backport a feature or bug fix to an older release. `semantic-release` refers to these as [maintenance branches](https://semantic-release.gitbook.io/semantic-release/usage/workflow-configuration#maintenance-branches).

Maintenance branch names should be of the form: `+([0-9])?(.{+([0-9]),x}).x`.

Regular expressions are complicated, but this essentially means branch names should look like:
* `1.15.x` for patch releases on top of the `1.15` release (after version `1.16` exists)
* `2.x` for feature releases on top of the `2` release (after version `3` exists)
