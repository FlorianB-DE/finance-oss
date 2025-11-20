import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, getSessionUser } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

const UNPROTECTED_PATHS = ['/login', '/api/public/health', '/auth/oidc'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const user = await getSessionUser(token);
		event.locals.user = user
			? {
					id: user.id,
					email: user.email
				}
			: null;

		if (!user) {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	} else {
		event.locals.user = null;
	}

	const requiresAuth =
		!UNPROTECTED_PATHS.some(path => event.url.pathname.startsWith(path)) &&
		!event.url.pathname.startsWith('/assets') &&
		!event.url.pathname.startsWith('/invoices/public');

	if (requiresAuth && !event.locals.user) {
		if (event.request.method === 'GET') {
			throw redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
		}
		return new Response('Nicht autorisiert', { status: 401 });
	}

	return resolve(event);
};
