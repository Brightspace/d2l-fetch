export class D2LFetch {

	constructor() {
		this._installedMiddlewares = [];
	}

	addTemp(middleware, { prepend = false } = { prepend: false }) {
		const { name, fn, options } = this._verifyMiddleware(middleware);
		const self = new D2LFetch();

		self._installedMiddlewares = this._installedMiddlewares.slice();
		const toAdd = { name, fn: self._wrapMiddleware(fn, options) };
		if (prepend) {
			self._installedMiddlewares.unshift(toAdd);
		} else {
			self._installedMiddlewares.push(toAdd);
		}

		return self;
	}

	fetch(input, options) {
		if ('string' === typeof input) {
			input = new Request(input, options);
		}
		if (false === input instanceof Request) {
			return Promise.reject(new TypeError('Invalid input argument(s) supplied.'));
		}

		const chain = this._installedMiddlewares.slice();
		chain.push({ name: 'fetch', fn: this._wrapMiddleware(window.fetch) });
		return chain.shift().fn.bind(this, chain)(input);
	}

	removeTemp(name) {
		if (!name || typeof name !== 'string') {
			throw TypeError('Middleware name must be a non-empty string');
		}
		const self = new D2LFetch();
		self._installedMiddlewares = this._installedMiddlewares.filter(middleware => middleware.name !== name);
		return self;
	}

	use(middleware) {
		const { name, fn, options } = this._verifyMiddleware(middleware);
		this._installedMiddlewares.push({ name, fn: this._wrapMiddleware(fn, options) });
	}

	_verifyMiddleware(middleware) {
		if (middleware && typeof middleware === 'object') {
			const { name, fn } = middleware;
			if (name && typeof name === 'string' &&
				fn && typeof fn === 'function') {
				return middleware;
			} else {
				throw TypeError('Middleware name/function is undefined or not a string/function');
			}
		} else {
			throw TypeError('Middleware parameter is undefined/null/empty or not an object');
		}
	}

	_wrapMiddleware(fn, options) {
		return (chain, request) => {
			let next;
			if (chain && chain.length !== 0) {
				next = chain.shift().fn.bind(this, chain);
			}
			return fn(request, next, options);
		};
	}
}
