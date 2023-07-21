import Swup from '../Swup.js';
import { Location } from '../helpers.js';

export interface PageData {
	url: string;
	html: string;
}

export interface FetchOptions extends RequestInit {
	method?: 'GET' | 'POST';
	body?: string | FormData | URLSearchParams;
	headers?: Record<string, string>;
	timeout?: number;
}

export class FetchError extends Error {
	url: string;
	status?: number;
	aborted: boolean;
	timedOut: boolean;
	constructor(
		message: string,
		details: { url: string; status?: number; aborted?: boolean; timedOut?: boolean }
	) {
		super(message);
		this.name = 'FetchError';
		this.url = details.url;
		this.status = details.status;
		this.aborted = details.aborted || false;
		this.timedOut = details.timedOut || false;
	}
}

/**
 * Fetch a page from the server, return it and cache it.
 */
export async function fetchPage(
	this: Swup,
	url: URL | string,
	options: FetchOptions & { triggerHooks?: boolean } = {}
): Promise<PageData> {
	url = Location.fromUrl(url).url;

	if (this.cache.has(url)) {
		const page = this.cache.get(url) as PageData;
		if (options.triggerHooks !== false) {
			await this.hooks.call('page:load', { page, cache: true });
		}
		return page;
	}

	const controller = new AbortController();
	const { signal } = controller;

	const headers = { ...this.options.requestHeaders, ...options.headers };
	const timeout = options.timeout ?? this.options.timeout;
	options = { ...options, headers, signal };

	let timedOut = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	if (timeout && timeout > 0) {
		timeoutId = setTimeout(() => {
			timedOut = true;
			controller.abort('timeout');
		}, timeout);
	}

	// Allow hooking before this and returning a custom response-like object (e.g. custom fetch implementation)
	let response: Response;
	try {
		response = await this.hooks.call(
			'fetch:request',
			{ url, options },
			(visit, { url, options }) => fetch(url, options)
		);
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	} catch (error: any) {
		if (timedOut) {
			this.hooks.call('fetch:timeout', { url });
			throw new FetchError(`Request timed out: ${url}`, { url, timedOut });
		}
		if (error?.name === 'AbortError' || signal.aborted) {
			throw new FetchError(`Request aborted: ${url}`, {
				url: url,
				aborted: true
			});
		}
		throw error;
	}

	const { status, url: responseUrl } = response;
	const html = await response.text();

	if (status === 500) {
		this.hooks.call('fetch:error', { status, response, url: responseUrl });
		throw new FetchError(`Server error: ${responseUrl}`, { status, url: responseUrl });
	}

	if (!html) {
		throw new FetchError(`Empty response: ${responseUrl}`, { status, url: responseUrl });
	}

	// Resolve real url after potential redirect
	const { url: finalUrl } = Location.fromUrl(responseUrl);
	const page = { url: finalUrl, html };

	// Only save cache entry for non-redirects
	if (url === finalUrl) {
		this.cache.set(page.url, page);
	}

	if (options.triggerHooks !== false) {
		await this.hooks.call('page:load', { page, cache: false });
	}

	return page;
}
