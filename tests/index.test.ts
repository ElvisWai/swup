import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	query,
	queryAll,
	nextTick,
	isPromise,
	runAsPromise,
	forceReflow,
	getContextualAttr
} from '../src/utils/index';

// Setup jsdom for DOM-related tests
import { JSDOM } from 'jsdom';

beforeEach(() => {
	const { window } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
	global.document = window.document;
	global.window = window;
	global.HTMLElement = window.HTMLElement;
	global.requestAnimationFrame = (callback: FrameRequestCallback) => {
		return setTimeout(callback, 16); // Simulates 60fps
	};
});

describe('query', () => {
	it('should return the element if it exists', () => {
		document.body.innerHTML = `<div class="test"></div>`;
		const element = query('.test');
		expect(element).toBeInstanceOf(HTMLElement);
	});

	it('should return null if the element does not exist', () => {
		document.body.innerHTML = '';
		const element = query('.non-existent');
		expect(element).toBeNull();
	});
});

describe('queryAll', () => {
	it('should return all elements matching the selector', () => {
		document.body.innerHTML = `<div class="test"></div><div class="test"></div>`;
		const elements = queryAll('.test');
		expect(elements).toHaveLength(2);
	});

	it('should return an empty array if no elements match the selector', () => {
		document.body.innerHTML = '';
		const elements = queryAll('.non-existent');
		expect(elements).toEqual([]);
	});
});

describe('nextTick', () => {
	it('should resolve after the next event loop', async () => {
		const mockFn = vi.fn();
		nextTick().then(mockFn);
		expect(mockFn).not.toHaveBeenCalled();
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		expect(mockFn).toHaveBeenCalled();
	});
});

describe('isPromise', () => {
	it('should return true for Promise objects', () => {
		expect(isPromise(Promise.resolve())).toBe(true);
	});

	it('should return true for thenable objects', () => {
		const thenable = { then: () => {} };
		expect(isPromise(thenable)).toBe(true);
	});

	it('should return false for non-Promise objects', () => {
		expect(isPromise({})).toBe(false);
		expect(isPromise(null)).toBe(false);
		expect(isPromise(undefined)).toBe(false);
		expect(isPromise(42)).toBe(false);
	});
});

describe('runAsPromise', () => {
	it('should resolve with the result of a synchronous function', async () => {
		const syncFn = () => 42;
		await expect(runAsPromise(syncFn)).resolves.toBe(42);
	});

	it('should resolve with the result of an asynchronous function', async () => {
		const asyncFn = () => Promise.resolve(42);
		await expect(runAsPromise(asyncFn)).resolves.toBe(42);
	});

	it('should reject if the function throws an error', async () => {
		const errorFn = () => {
			throw new Error('Error!');
		};
		await expect(runAsPromise(errorFn)).rejects.toThrow('Error!');
	});

	it('should reject if the asynchronous function rejects', async () => {
		const asyncErrorFn = () => Promise.reject(new Error('Async Error!'));
		await expect(runAsPromise(asyncErrorFn)).rejects.toThrow('Async Error!');
	});
});

describe('forceReflow', () => {
	it('should force a reflow on the given element', () => {
		const element = document.createElement('div');
		document.body.appendChild(element);
		const spy = vi.spyOn(element, 'getBoundingClientRect');
		forceReflow(element);
		expect(spy).toHaveBeenCalled();
	});

	it('should force a reflow on document.body if no element is provided', () => {
		const spy = vi.spyOn(document.body, 'getBoundingClientRect');
		forceReflow();
		expect(spy).toHaveBeenCalled();
	});
});

describe('getContextualAttr', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should return the attribute value from the closest element', () => {
		document.body.innerHTML = `<div data-test="value"><span id="child"></span></div>`;
		const child = document.getElementById('child');
		expect(getContextualAttr(child, 'data-test')).toBe('value');
	});

	it('should return true if the attribute is present without a value', () => {
		document.body.innerHTML = `<div data-test><span id="child"></span></div>`;
		const child = document.getElementById('child');
		expect(getContextualAttr(child, 'data-test')).toBe(true);
	});

	it('should return undefined if no element with the attribute is found', () => {
		document.body.innerHTML = `<div><span id="child"></span></div>`;
		const child = document.getElementById('child');
		expect(getContextualAttr(child, 'data-test')).toBeUndefined();
	});
});
