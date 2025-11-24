import type { Handle, HandleServerError } from '@sveltejs/kit';
import { SESSION_COOKIE, getSessionUser } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { createLogger } from '$lib/server/logger';

const log = createLogger({ component: 'hooks' });
const UNPROTECTED_PATHS = [
	'/login',
	'/api/public/health',
	'/auth/oidc',
	'/impressum',
	'/datenschutz'
];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		try {
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
		} catch (error) {
			log.error({ err: error, path: event.url.pathname }, 'Error getting session user');
			event.locals.user = null;
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

	try {
		return await resolve(event);
	} catch (error) {
		log.error(
			{
				err: error,
				path: event.url.pathname,
				method: event.request.method
			},
			'Error handling request'
		);
		throw error;
	}
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	log.error(
		{
			err: error,
			status,
			message,
			path: event.url.pathname,
			method: event.request.method
		},
		'Server error'
	);

	return {
		message: status === 500 ? 'Internal Server Error' : message
	};
};
