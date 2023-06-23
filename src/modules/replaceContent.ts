import Swup, { Options } from '../Swup.js';
import { PageData } from './fetchPage.js';

/**
 * Perform the replacement of content after loading a page.
 *
 * It takes an object with the page data as returned from `fetchPage` and a list
 * of container selectors to replace.
 */
export const replaceContent = function (
	this: Swup,
	{ html }: PageData,
	{ containers }: { containers: Options['containers'] } = this.options
): void {
	const doc = new DOMParser().parseFromString(html, 'text/html');

	// Update browser title
	const title = doc.querySelector('title')?.innerText || '';
	document.title = title;

	// Update content containers
	containers.forEach((selector) => {
		const currentEl = document.querySelector(selector);
		const incomingEl = doc.querySelector(selector);
		if (!currentEl) {
			console.warn(`[swup] Container missing in current document: ${selector}`);
			return;
		}
		if (!incomingEl) {
			console.warn(`[swup] Container missing in incoming document: ${selector}`);
			return;
		}
		currentEl.replaceWith(incomingEl);
	});
};
