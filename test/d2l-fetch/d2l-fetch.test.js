import '../../d2l-fetch.js';
import { expect } from '@brightspace-ui/testing';
import sinon from 'sinon';

const invalidRequestInputs = [
	undefined,
	null,
	1,
	{},
	{ whatiam: 'is not a Request' }
];

const invalidMiddlewareInputs = [
	undefined,
	null,
	1,
	'notMiddleware',
	[],
	{},
	{ whatiam: 'is not middleware' },
	{ name: 'validName' },
	{ fn: () => {} },
	{ name: undefined, fn: undefined },
	{ name: undefined, fn: () => {} },
	{ name: null, fn: () => {} },
	{ name: 1, fn: () => {} },
	{ name: '', fn: () => {} },
	{ name: 'validName', fn: undefined },
	{ name: 'validName', fn: null },
	{ name: 'validName', fn: 1 },
	{ name: 'validName', fn: 'not a function' }
];

const invalidMiddlewareNameInputs = [
	undefined,
	null,
	1,
	'',
	[],
	{},
	{ name: 'a middleware', fn: () => {} }
];

describe('d2l-fetch', () => {

	let sandbox;

	const passthroughMiddleware = function(request, next) {
		return next(request);
	};

	const earlyExitMiddleware = () => {
		return;
	};

	function getRequest() {
		return new Request('/path/to/data');
	}

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(window, 'fetch');
	});

	afterEach(() => {
		sandbox.restore();
		window.d2lfetch._installedMiddlewares = [];
	});

	it('should be a thing', () => {
		expect(window.d2lfetch).to.exist;
	});

	describe('.use', () => {
		it('should be a public function', () => {
			expect(window.d2lfetch.use instanceof Function).to.equal(true);
		});

		it('should wrap the supplied function in a middleware handler function', () => {
			sandbox.spy(window.d2lfetch, '_wrapMiddleware');
			window.d2lfetch.use({ name: 'passthroughMiddleware', fn: passthroughMiddleware });
			expect(window.d2lfetch._wrapMiddleware).to.be.calledWith(passthroughMiddleware);
		});

		it('should pass optional use options in to the wrap function', () => {
			const useOptions = { found: true };
			sandbox.spy(window.d2lfetch, '_wrapMiddleware');
			window.d2lfetch.use({ name: 'passthroughMiddleware', fn: passthroughMiddleware, options: useOptions });
			expect(window.d2lfetch._wrapMiddleware).to.be.calledWith(passthroughMiddleware, useOptions);
		});

		it('should add the wrapped function to the _installedMiddlewares array', () => {
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
			window.d2lfetch.use({ name: 'passthroughMiddleware', fn: passthroughMiddleware });
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(1);
		});

		it('should throw a TypeError when passed invalid', () => {
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
			window.d2lfetch.use({ name: 'passthroughMiddleware', fn: passthroughMiddleware });
			expect(window.d2lfetch._installedMiddlewares.length).to.equal(1);
		});

		invalidMiddlewareInputs.forEach((input) => {
			it('should throw a TypeError if it is not passed a valid middleware object', () => {
				expect(() => { window.d2lfetch.use(input); }).to.throw(TypeError);
			});
		});
	});

	describe('.fetch', () => {

		const windowFetchResponse = Promise.resolve(new Response());
		let passthroughSpy, earlyExitSpy;

		beforeEach(() => {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			earlyExitSpy = sandbox.spy(earlyExitMiddleware);
		});

		it('should be a public function', () => {
			expect(window.d2lfetch.fetch instanceof Function).to.equal(true);
		});

		invalidRequestInputs.forEach((input) => {
			it('should throw a TypeError if it is not passed a Request object or the provided input cannot be used to create a new Request object', () => {
				return window.d2lfetch.fetch(input)
					.then((() => { expect.fail(); }), (err) => { expect(err instanceof TypeError).to.equal(true); });
			});
		});

		describe('when no middleware is present', () => {
			it('should call window.fetch with the provided Request object', () => {
				expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
				const req = getRequest();
				return window.d2lfetch.fetch(req)
					.then(() => {
						expect(window.fetch).to.be.calledWith(req);
					});
			});

			it('should call window.fetch with a request object created from the provided url and options', () => {
				expect(window.d2lfetch._installedMiddlewares.length).to.equal(0);
				const url = '/path/to/data';
				const options = { method: 'PUT' };
				return window.d2lfetch.fetch(url, options)
					.then(() => {
						expect(window.fetch).to.be.calledWith(sinon.match.has('url', sinon.match(/\/path\/to\/data$/)));
						expect(window.fetch).to.be.calledWith(sinon.match.has('method', 'PUT'));
					});
			});
		});

		describe('when one middleware is use\'d', () => {

			it('should call the middleware', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
			});

			it('should not call window.fetch if the middleware does not call next()', () => {
				window.d2lfetch.use({ name: 'earlyExitSpy', fn: earlyExitSpy });
				window.d2lfetch.fetch(getRequest());
				expect(earlyExitSpy).to.be.called;
				expect(window.fetch).not.to.be.called;
			});

			it('should call window.fetch when the middleware calls next()', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.called;
				expect(window.fetch).to.be.called;
			});

			it('should receive a Promise from window.fetch', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				const response = window.d2lfetch.fetch(getRequest());
				expect(response).to.equal(windowFetchResponse);
			});

			it('should pass provided options to the middleware function when calling it', () => {
				const useOptions = { found: true };
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy, options: useOptions });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy.getCall(0).args[2]).to.equal(useOptions);
			});
		});

		describe('when multiple middlewares are use\'d', () => {

			const thirdMiddleware = function(request, next) {
				return next(request);
			};
			let anotherSpy;

			beforeEach(() => {
				anotherSpy = sandbox.spy(thirdMiddleware);
			});

			it('should call the middlewares in the order they were use\'d', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
				window.d2lfetch.use({ name: 'earlyExitSpy', fn: earlyExitSpy });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(earlyExitSpy);
			});

			it('should not call further down the chain if at any point a middleware does not call next()', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				window.d2lfetch.use({ name: 'earlyExitSpy', fn: earlyExitSpy });
				window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(earlyExitSpy);
				expect(anotherSpy).not.to.be.called;
			});

			it('should call window.fetch when the final use\'d middleware calls next()', () => {
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
				window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy).to.be.calledBefore(anotherSpy);
				expect(anotherSpy).to.be.calledBefore(window.fetch);
				expect(window.fetch).to.be.called;
			});

			it('should pass the appropriate use options to each middleware function when called', () => {
				const passthroughSpyOptions = { found: true };
				const earlyExitSpyOptions = { found: false };
				window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy, options: passthroughSpyOptions });
				window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
				window.d2lfetch.use({ name: 'earlyExitSpy', fn: earlyExitSpy, options: earlyExitSpyOptions });
				window.d2lfetch.fetch(getRequest());
				expect(passthroughSpy.getCall(0).args[2]).to.equal(passthroughSpyOptions);
				expect(anotherSpy.getCall(0).args[2]).to.be.undefined;
				expect(earlyExitSpy.getCall(0).args[2]).to.equal(earlyExitSpyOptions);
			});
		});
	});

	describe('.addTemp', () => {
		const windowFetchResponse = Promise.resolve(new Response());
		const secondMiddleware = function(request, next) {
			return next(request);
		};
		let passthroughSpy, anotherSpy;

		beforeEach(() => {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			anotherSpy = sandbox.spy(secondMiddleware);
		});

		it('should be a public function', () => {
			expect(window.d2lfetch.addTemp instanceof Function).to.equal(true);
		});

		it('should return a new D2LFetch object', () => {
			expect(window.d2lfetch.addTemp({ name: 'test', fn: () => {} })).not.to.equal(window.d2lfetch);
		});

		it('should return a new D2LFetch object with a different set of middleware', () => {
			expect(window.d2lfetch.addTemp({ name: 'test', fn: () => {} })._installedMiddlewares).not.to.equal(window.d2lfetch._installedMiddlewares);
		});

		invalidMiddlewareInputs.forEach((input) => {
			it('should throw a TypeError if it is not passed a valid middleware object', () => {
				expect(() => { window.d2lfetch.addTemp(input); }).to.throw(TypeError);
			});
		});

		it('should add a new middleware to installed middlewares of the new D2LFetch object', () => {
			expect(window.d2lfetch._installedMiddlewares).to.be.empty;
			expect(window.d2lfetch.addTemp({ name: 'test', fn: () => {} })._installedMiddlewares).to.have.lengthOf(1);
		});

		it('should add new middleware after all other middlewares', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.addTemp({ name: 'anotherSpy', fn: anotherSpy }).fetch(getRequest());
			expect(passthroughSpy).to.be.calledBefore(anotherSpy);
		});

		it('should not affect window.d2lfetch functionality', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.addTemp({ name: 'anotherSpy', fn: anotherSpy });
			window.d2lfetch.fetch(getRequest());
			expect(passthroughSpy).to.be.called;
			expect(anotherSpy).not.to.be.called;
		});

		it('should be able to be chain called multiple times', () => {
			window.d2lfetch
				.addTemp({ name: 'passthroughSpy', fn: passthroughSpy })
				.addTemp({ name: 'anotherSpy', fn: anotherSpy })
				.fetch(getRequest());
			expect(anotherSpy).to.be.called;
			expect(passthroughSpy).to.be.calledBefore(anotherSpy);
		});

		it('should be able to be chain called with D2lFetch.removeTemp', () => {
			window.d2lfetch
				.addTemp({ name: 'passthroughSpy', fn: passthroughSpy })
				.removeTemp('passthroughSpy')
				.fetch();
			expect(passthroughSpy).not.to.be.called;
		});
	});

	describe('.removeTemp', () => {
		const windowFetchResponse = Promise.resolve(new Response());
		const secondMiddleware = function(request, next) {
			return next(request);
		};
		let passthroughSpy, anotherSpy;

		beforeEach(() => {
			window.fetch.returns(windowFetchResponse);
			passthroughSpy = sandbox.spy(passthroughMiddleware);
			anotherSpy = sandbox.spy(secondMiddleware);
		});

		it('should be a public function', () => {
			expect(window.d2lfetch.removeTemp instanceof Function).to.equal(true);
		});

		it('should return a new D2LFetch object', () => {
			const newD2LFetch = window.d2lfetch.removeTemp('test');
			expect(newD2LFetch).not.to.equal(window.d2lfetch);
			expect(newD2LFetch.fetch instanceof Function).to.be.true;
		});

		it('should return a new D2LFetch object with a different set of middleware', () => {
			expect(window.d2lfetch.removeTemp('test')._installedMiddlewares).not.to.equal(window.d2lfetch._installedMiddlewares);
		});

		invalidMiddlewareNameInputs.forEach((input) => {
			it('should throw a TypeError if passed an invalid middleware name', () => {
				expect(() => { window.d2lfetch.removeTemp(input); }).to.throw(TypeError);
			});
		});

		it('should remove a specified installed middleware', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.removeTemp('passthroughSpy').fetch(getRequest());
			expect(passthroughSpy).not.to.be.called;
		});

		it('should remove ONLY the specified installed middleware', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
			window.d2lfetch.removeTemp('passthroughSpy').fetch(getRequest());
			expect(passthroughSpy).not.to.be.called;
			expect(anotherSpy).to.be.called;
		});

		it('should not change any functionality when passed a middleware name that is not installed', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
			window.d2lfetch.removeTemp('notThereMiddleware').fetch(getRequest());
			expect(passthroughSpy).to.be.called;
			expect(anotherSpy).to.be.called;
		});

		it('should not affect window.d2lfetch functionality', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.removeTemp('passthroughSpy');
			window.d2lfetch.fetch(getRequest());
			expect(passthroughSpy).to.be.called;
		});

		it('should be able to be chain called', () => {
			window.d2lfetch.use({ name: 'passthroughSpy', fn: passthroughSpy });
			window.d2lfetch.use({ name: 'anotherSpy', fn: anotherSpy });
			window.d2lfetch
				.removeTemp('passthroughSpy')
				.removeTemp('anotherSpy')
				.fetch(getRequest());
			expect(passthroughSpy).not.to.be.called;
			expect(anotherSpy).not.to.be.called;
		});
	});

});
